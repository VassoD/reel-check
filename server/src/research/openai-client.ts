import OpenAI from "openai";
import type { ParsedResponse } from "openai/resources/responses/responses";
import { config } from "@/config";
import { ResearchError } from "@/lib/errors";

const REQUEST_TIMEOUT_MS = 5 * 60_000;
const MAX_RETRIES = 3;

export const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  timeout: REQUEST_TIMEOUT_MS,
  maxRetries: MAX_RETRIES,
});

export interface CallUsage {
  inputTokens: number;
  outputTokens: number;
}

export function usageOf(response: ParsedResponse<unknown>): CallUsage {
  return {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}

/** Returns the parsed structured output, or throws a ResearchError that says why there is none. */
export function requireParsedOutput<T>(response: ParsedResponse<T>, step: string): T {
  if (response.output_parsed) return response.output_parsed;

  const refusal = response.output
    .flatMap((item) => (item.type === "message" ? item.content : []))
    .find((content) => content.type === "refusal");
  if (refusal) {
    throw new ResearchError("The model declined to analyze this content.", { step, refusal: refusal.refusal });
  }
  throw new ResearchError("The model did not return a usable result.", {
    step,
    status: response.status,
    incompleteReason: response.incomplete_details?.reason,
  });
}

export function toResearchError(error: unknown, step: string): ResearchError {
  if (error instanceof ResearchError) return error;
  if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) {
    return new ResearchError("The research service rejected the API key.", { step, error });
  }
  if (error instanceof OpenAI.RateLimitError) {
    return new ResearchError("The research service is rate limiting requests. Try again in a few minutes.", {
      step,
      error,
    });
  }
  return new ResearchError("The research service failed.", { step, error });
}

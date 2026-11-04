import { zodTextFormat } from "openai/helpers/zod";
import type { ParsedResponse } from "openai/resources/responses/responses";
import type { Claim } from "@/analyses/analysis-types";
import { config } from "@/config";
import { openai, requireParsedOutput, toResearchError, usageOf, type CallUsage } from "@/research/openai-client";
import { investigationInstructions } from "@/research/prompts";
import { InvestigationSchema, type Investigation } from "@/research/research-schemas";

const MAX_OUTPUT_TOKENS = 32_000;
const REASONING_EFFORT = "high";
const TRACKING_PARAM_PATTERN = /^(utm_|fbclid$|gclid$|igsh$)/;

interface InvestigationContext {
  claim: Claim;
  videoTopic: string;
  videoSummary: string;
  model: string;
}

export interface InvestigationOutcome {
  investigation: Investigation & { unverifiedSourceCount: number };
  usage: CallUsage & { webSearches: number };
}

function stripTrackingParams(raw: string): string {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAM_PATTERN.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

/** Comparison key only: ignores tracking params, fragments, "www." and trailing slashes. */
function canonicalUrl(raw: string): string {
  try {
    const url = new URL(stripTrackingParams(raw));
    url.hash = "";
    url.hostname = url.hostname.replace(/^www\./, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

/** Every URL the model actually saw this turn: search results, opened pages and inline citations. */
function collectSeenUrls(response: ParsedResponse<unknown>): { urls: Set<string>; searchCount: number } {
  const urls = new Set<string>();
  let searchCount = 0;
  for (const item of response.output) {
    if (item.type === "web_search_call") {
      if (item.action.type === "search") {
        searchCount++;
        for (const source of item.action.sources ?? []) urls.add(canonicalUrl(source.url));
      } else if (item.action.type === "open_page" && item.action.url) {
        urls.add(canonicalUrl(item.action.url));
      } else if (item.action.type === "find_in_page") {
        urls.add(canonicalUrl(item.action.url));
      }
    }
    if (item.type === "message") {
      for (const content of item.content) {
        if (content.type !== "output_text") continue;
        for (const annotation of content.annotations) {
          if (annotation.type === "url_citation") urls.add(canonicalUrl(annotation.url));
        }
      }
    }
  }
  return { urls, searchCount };
}

function describeClaim({ claim, videoTopic, videoSummary }: InvestigationContext): string {
  return [
    `Today's date: ${new Date().toISOString().slice(0, 10)}`,
    `<video_context>\nTopic: ${videoTopic}\n${videoSummary}\n</video_context>`,
    `<claim kind="${claim.kind}">\n${claim.statement}\n</claim>`,
    claim.quote ? `<original_wording>\n${claim.quote}\n</original_wording>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function investigateClaim(context: InvestigationContext): Promise<InvestigationOutcome> {
  try {
    const response = await openai.responses.parse({
      model: context.model,
      instructions: investigationInstructions(config.REPORT_LANGUAGE),
      input: describeClaim(context),
      tools: [{ type: "web_search", search_context_size: "high" }],
      include: ["web_search_call.action.sources"],
      reasoning: { effort: REASONING_EFFORT },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      text: { format: zodTextFormat(InvestigationSchema, "claim_investigation") },
    });
    const investigation = requireParsedOutput(response, "investigation");

    // The model writes the source list itself, so drop any URL it never actually retrieved.
    const { urls: seenUrls, searchCount } = collectSeenUrls(response);
    const verifiedSources = investigation.sources
      .filter((source) => seenUrls.has(canonicalUrl(source.url)))
      .map((source) => ({ ...source, url: stripTrackingParams(source.url) }));

    return {
      investigation: {
        ...investigation,
        sources: verifiedSources,
        unverifiedSourceCount: investigation.sources.length - verifiedSources.length,
      },
      usage: { ...usageOf(response), webSearches: searchCount },
    };
  } catch (error) {
    throw toResearchError(error, "investigation");
  }
}

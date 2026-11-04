import type { z } from "zod";
import {
  AnalysisListResponseSchema,
  AnalysisResponseSchema,
  ApiErrorResponseSchema,
  ModelsResponseSchema,
  type Analysis,
  type AnalysisSummary,
  type ModelCatalog,
} from "@/features/analyses/analysis-schemas";
import type { ServerSettings } from "@/features/settings/settings-storage";

const REQUEST_TIMEOUT_MS = 15_000;
export const API_PREFIX = "/api/v1";
const HTTP_BAD_REQUEST = 400;

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class ResponseShapeError extends Error {
  constructor() {
    super("The server sent a response this version of the app does not understand.");
    this.name = "ResponseShapeError";
  }
}

export async function request<T>(
  settings: ServerSettings,
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${settings.token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new NetworkError(`Could not reach the server at ${settings.baseUrl}. Is it running and on the same network?`);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(body);
    if (parsedError.success) {
      throw new ApiError(parsedError.data.error.code, parsedError.data.error.message, response.status);
    }
    throw new ApiError("HTTP_ERROR", `The server responded with ${response.status}.`, response.status);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ResponseShapeError();
  return parsed.data;
}

export interface CreateAnalysisInput {
  sharedText: string;
  /** Omit to use the server's default model. */
  model?: string;
  /** Run a fresh analysis even if one exists for this video and model. */
  refresh?: boolean;
}

export async function createAnalysis(settings: ServerSettings, input: CreateAnalysisInput): Promise<Analysis> {
  const { data } = await request(settings, `${API_PREFIX}/analyses`, AnalysisResponseSchema, {
    method: "POST",
    body: JSON.stringify({ url: input.sharedText, model: input.model, refresh: input.refresh }),
  });
  return data;
}

export async function fetchModels(settings: ServerSettings, signal?: AbortSignal): Promise<ModelCatalog> {
  const { data } = await request(settings, `${API_PREFIX}/models`, ModelsResponseSchema, { signal });
  return data;
}

export async function fetchAnalysis(settings: ServerSettings, id: string, signal?: AbortSignal): Promise<Analysis> {
  const { data } = await request(settings, `${API_PREFIX}/analyses/${encodeURIComponent(id)}`, AnalysisResponseSchema, {
    signal,
  });
  return data;
}

export async function fetchAnalyses(settings: ServerSettings, signal?: AbortSignal): Promise<AnalysisSummary[]> {
  const { data } = await request(settings, `${API_PREFIX}/analyses?limit=50`, AnalysisListResponseSchema, { signal });
  return data;
}

/** Checks the URL and the token with one authenticated request. */
export async function verifyConnection(settings: ServerSettings): Promise<void> {
  await request(settings, `${API_PREFIX}/analyses?limit=1`, AnalysisListResponseSchema);
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError && error.code === "AUTH_REQUIRED") {
    return error.status === HTTP_BAD_REQUEST
      ? "The access token has characters it shouldn't. Paste it again, with nothing before or after it."
      : "The server rejected the access token. Check it in Settings.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

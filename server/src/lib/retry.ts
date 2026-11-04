import { RetryableHttpError } from "@/lib/errors";
import { logger } from "@/lib/logger";

interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  operation: string;
}

const DEFAULT_RETRY_OPTIONS: Omit<RetryOptions, "operation"> = {
  retries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 15_000,
};

function isRetryable(error: unknown): boolean {
  if (error instanceof RetryableHttpError) return true;
  // fetch() rejects with a TypeError on network failures and a TimeoutError on AbortSignal.timeout.
  return error instanceof TypeError || (error instanceof DOMException && error.name === "TimeoutError");
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> & Pick<RetryOptions, "operation">,
): Promise<T> {
  const { retries, baseDelayMs, maxDelayMs, operation } = { ...DEFAULT_RETRY_OPTIONS, ...options };
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw error;
      const jitterMs = Math.random() * baseDelayMs;
      const delayMs = Math.min(baseDelayMs * 2 ** attempt + jitterMs, maxDelayMs);
      logger.warn("Retrying operation", { operation, attempt: attempt + 1, delayMs: Math.round(delayMs), error });
      await Bun.sleep(delayMs);
    }
  }
}

/** Throws RetryableHttpError for 429/5xx so withRetry picks them up; returns the response otherwise. */
export async function throwIfRetryableStatus(response: Response): Promise<Response> {
  if (response.status === 429 || response.status >= 500) {
    throw new RetryableHttpError(response.status, await response.text());
  }
  return response;
}

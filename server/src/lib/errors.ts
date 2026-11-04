export type ErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_INPUT"
  | "UNSUPPORTED_URL"
  | "NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "DOWNLOAD_FAILED"
  | "DOWNLOAD_BLOCKED"
  | "MEDIA_PROCESSING_FAILED"
  | "TRANSCRIPTION_FAILED"
  | "RESEARCH_FAILED"
  | "INTERRUPTED"
  | "INTERNAL_ERROR";

/**
 * Base error whose `message` is safe to show to the user. Internal detail goes in `cause`,
 * which is logged but never returned by the API.
 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly httpStatus: number = 500,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: ErrorCode = "INVALID_INPUT") {
    super(code, message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super("NOT_FOUND", message, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super("RATE_LIMIT_EXCEEDED", message, 429);
  }
}

export class DownloadError extends AppError {
  constructor(message: string, code: "DOWNLOAD_FAILED" | "DOWNLOAD_BLOCKED", cause?: unknown) {
    super(code, message, 502, { cause });
  }
}

export class MediaError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("MEDIA_PROCESSING_FAILED", message, 500, { cause });
  }
}

export class TranscriptionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("TRANSCRIPTION_FAILED", message, 502, { cause });
  }
}

export class ResearchError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("RESEARCH_FAILED", message, 502, { cause });
  }
}

export class CommandError extends Error {
  constructor(
    readonly command: string,
    readonly exitCode: number,
    readonly stderr: string,
  ) {
    super(`${command} exited with code ${exitCode}`);
    this.name = "CommandError";
  }
}

export class CommandTimeoutError extends Error {
  constructor(
    readonly command: string,
    readonly timeoutMs: number,
  ) {
    super(`${command} timed out after ${timeoutMs}ms`);
    this.name = "CommandTimeoutError";
  }
}

/** Errors worth retrying: network failures and 429/5xx responses. */
export class RetryableHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`HTTP ${status}`);
    this.name = "RetryableHttpError";
  }
}

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack, cause: serializeError(error.cause) };
  }
  return error;
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  const entry: LogContext = { timestamp: new Date().toISOString(), level, message, ...context };
  if ("error" in context) {
    entry.error = serializeError(context.error);
  }
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
  stream.write(`${JSON.stringify(entry)}\n`);
}

export const logger = {
  debug: (message: string, context?: LogContext): void => write("debug", message, context),
  info: (message: string, context?: LogContext): void => write("info", message, context),
  warn: (message: string, context?: LogContext): void => write("warn", message, context),
  error: (message: string, context?: LogContext): void => write("error", message, context),
};

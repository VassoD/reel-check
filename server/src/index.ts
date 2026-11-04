import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { HTTPException } from "hono/http-exception";
import { requestId, type RequestIdVariables } from "hono/request-id";
import { analysisRoutes, modelRoutes } from "@/analyses/analysis-routes";
import { appUpdateRoutes } from "@/app-updates/app-update-routes";
import { analysisStore } from "@/analyses/analysis-store";
import { config } from "@/config";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const app = new Hono<{ Variables: RequestIdVariables }>();

app.use("*", requestId());

app.use("*", async (c, next) => {
  const startedAt = Date.now();
  await next();
  logger.info("Request handled", {
    requestId: c.get("requestId"),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - startedAt,
  });
});

app.get("/health", (c) => c.json({ data: { status: "ok" } }));

app.use(
  "/api/*",
  bearerAuth({
    token: config.APP_TOKEN,
    noAuthenticationHeader: { message: { error: { code: "AUTH_REQUIRED", message: "Missing bearer token." } } },
    invalidToken: { message: { error: { code: "AUTH_REQUIRED", message: "Invalid bearer token." } } },
    invalidAuthenticationHeader: { message: { error: { code: "AUTH_REQUIRED", message: "Malformed Authorization header." } } },
  }),
);

app.route("/api/v1/analyses", analysisRoutes);
app.route("/api/v1/models", modelRoutes);
app.route("/api/v1/app", appUpdateRoutes);

app.notFound((c) =>
  c.json({ error: { code: "NOT_FOUND", message: "Route not found.", requestId: c.get("requestId") } }, 404),
);

app.onError((error, c) => {
  const requestIdValue = c.get("requestId");
  // Thrown by Hono middleware such as bearerAuth; it already carries the intended response.
  if (error instanceof HTTPException) return error.getResponse();
  if (error instanceof AppError) {
    if (error.httpStatus >= 500) logger.error("Request failed", { requestId: requestIdValue, error });
    return c.json(
      { error: { code: error.code, message: error.message, requestId: requestIdValue } },
      error.httpStatus as 400,
    );
  }
  logger.error("Unhandled request error", { requestId: requestIdValue, error });
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong.", requestId: requestIdValue } },
    500,
  );
});

const interrupted = analysisStore.failInterrupted();
if (interrupted > 0) logger.warn("Marked interrupted analyses as failed", { count: interrupted });

logger.info("Server listening", { host: config.HOST, port: config.PORT, model: config.RESEARCH_MODEL });

export default {
  hostname: config.HOST,
  port: config.PORT,
  fetch: app.fetch,
  // Bun closes idle connections after 10s by default; polling clients reconnect, so keep it short but explicit.
  idleTimeout: 30,
};

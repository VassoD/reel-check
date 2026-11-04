import { Hono } from "hono";
import type { RequestIdVariables } from "hono/request-id";
import { z } from "zod";
import { analysisStore } from "@/analyses/analysis-store";
import { createAnalysis, runAnalysis } from "@/analyses/run-analysis";
import { config } from "@/config";
import { NotFoundError, RateLimitError, ValidationError } from "@/lib/errors";
import { SlidingWindowRateLimiter } from "@/lib/rate-limiter";
import { normalizeSourceUrl } from "@/media/source-url";
import { defaultResearchModel, RESEARCH_MODEL_IDS, RESEARCH_MODELS } from "@/research/research-models";

const ONE_HOUR_MS = 60 * 60_000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_SHARED_TEXT_LENGTH = 2_000;
const RATE_LIMIT_KEY = "analyses:create";

const CreateAnalysisBodySchema = z.object({
  url: z.string().min(1).max(MAX_SHARED_TEXT_LENGTH),
  refresh: z.boolean().optional(),
  model: z.string().optional(),
});

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

// Each analysis costs real money (transcription plus several model calls with web search).
const createLimiter = new SlidingWindowRateLimiter(config.MAX_ANALYSES_PER_HOUR, ONE_HOUR_MS);

export const analysisRoutes = new Hono<{ Variables: RequestIdVariables }>()
  .post("/", async (c) => {
    const body = CreateAnalysisBodySchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Send a JSON body like { \"url\": \"https://...\" }.");

    const model = body.data.model ?? defaultResearchModel();
    if (!RESEARCH_MODEL_IDS.includes(model) && model !== defaultResearchModel()) {
      throw new ValidationError(`Unknown model. Choose one of: ${RESEARCH_MODEL_IDS.join(", ")}.`);
    }

    const sourceUrl = normalizeSourceUrl(body.data.url);
    if (!body.data.refresh) {
      // Reuse only a result from the same model; asking with another model means wanting a second opinion.
      const existing = analysisStore.findReusableBySourceUrl(sourceUrl);
      if (existing && existing.model === model) return c.json({ data: existing }, 200);
    }

    if (!createLimiter.tryConsume(RATE_LIMIT_KEY)) {
      throw new RateLimitError(`Limit of ${config.MAX_ANALYSES_PER_HOUR} new analyses per hour reached.`);
    }
    const analysis = createAnalysis(sourceUrl, model);
    void runAnalysis(analysis);
    return c.json({ data: analysis }, 202);
  })
  .get("/", (c) => {
    const query = ListQuerySchema.safeParse(c.req.query());
    if (!query.success) throw new ValidationError("limit must be 1-100 and offset must be 0 or more.");
    const { items, total } = analysisStore.list(query.data.limit, query.data.offset);
    return c.json({ data: items, pagination: { limit: query.data.limit, offset: query.data.offset, total } });
  })
  .get("/:id", (c) => {
    const analysis = analysisStore.findById(c.req.param("id"));
    if (!analysis) throw new NotFoundError("Analysis not found.");
    return c.json({ data: analysis });
  })
  .delete("/:id", (c) => {
    if (!analysisStore.softDelete(c.req.param("id"))) throw new NotFoundError("Analysis not found.");
    return c.body(null, 204);
  });

export const modelRoutes = new Hono<{ Variables: RequestIdVariables }>().get("/", (c) =>
  c.json({ data: { models: RESEARCH_MODELS, defaultModel: defaultResearchModel() } }),
);

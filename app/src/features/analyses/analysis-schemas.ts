import { z } from "zod";

// Mirrors server/src/analyses/analysis-types.ts. Objects are loose so a newer server
// adding fields never breaks an older build of the app.

export const EVIDENCE_STATUSES = [
  "well_supported",
  "partly_supported",
  "misleading",
  "contested",
  "unsupported",
  "contradicted",
  "unverifiable",
] as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

const AnalysisStatusSchema = z.enum([
  "queued",
  "downloading",
  "transcribing",
  "breaking_down",
  "investigating",
  "done",
  "failed",
]);

export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

const SourceSchema = z.looseObject({
  title: z.string(),
  url: z.string(),
  publisher: z.string(),
  sourceType: z.string(),
  relation: z.enum(["supports", "contradicts", "adds_context"]),
  keyFinding: z.string(),
});

export type Source = z.infer<typeof SourceSchema>;

const InvestigationResultSchema = z.looseObject({
  evidenceStatus: z.enum(EVIDENCE_STATUSES),
  confidence: z.enum(["low", "medium", "high"]),
  headline: z.string(),
  whatTheEvidenceShows: z.string(),
  missingContext: z.string().nullable(),
  strongestCounterpoint: z.string().nullable(),
  sources: z.array(SourceSchema),
  unverifiedSourceCount: z.number(),
});

export type InvestigationResult = z.infer<typeof InvestigationResultSchema>;

const ClaimInvestigationSchema = z.looseObject({
  claimId: z.string(),
  status: z.enum(["pending", "running", "done", "failed"]),
  result: InvestigationResultSchema.nullable(),
  errorMessage: z.string().nullable(),
});

export type ClaimInvestigation = z.infer<typeof ClaimInvestigationSchema>;

const ClaimSchema = z.looseObject({
  id: z.string(),
  statement: z.string(),
  quote: z.string().nullable(),
  kind: z.string(),
  checkable: z.boolean(),
  centrality: z.enum(["core", "supporting", "peripheral"]),
});

export type Claim = z.infer<typeof ClaimSchema>;

const BreakdownSchema = z.looseObject({
  topic: z.string(),
  summary: z.string(),
  coreMessage: z.string(),
  speaker: z.looseObject({
    description: z.string(),
    statedCredentials: z.string().nullable(),
    interests: z.array(z.string()),
  }),
  claims: z.array(ClaimSchema),
  persuasionTechniques: z.array(z.looseObject({ technique: z.string(), howItIsUsed: z.string() })),
  reflectionQuestions: z.array(z.string()),
  limitations: z.string().nullable(),
});

export type Breakdown = z.infer<typeof BreakdownSchema>;

export const AnalysisSchema = z.looseObject({
  id: z.string(),
  sourceUrl: z.string(),
  model: z.string().nullish(),
  status: AnalysisStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  source: z
    .looseObject({
      author: z.string().nullable(),
      caption: z.string().nullable(),
      durationSeconds: z.number().nullable(),
      postedAt: z.string().nullable(),
      thumbnailUrl: z.string().nullable(),
    })
    .nullable(),
  transcript: z.looseObject({ text: z.string(), languages: z.array(z.string()) }).nullable(),
  breakdown: BreakdownSchema.nullable(),
  investigations: z.array(ClaimInvestigationSchema),
  error: z.looseObject({ code: z.string(), message: z.string() }).nullable(),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export const AnalysisSummarySchema = z.looseObject({
  id: z.string(),
  sourceUrl: z.string(),
  status: AnalysisStatusSchema,
  createdAt: z.string(),
  model: z.string().nullish(),
  topic: z.string().nullable(),
  author: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  claimCount: z.number(),
});

export type AnalysisSummary = z.infer<typeof AnalysisSummarySchema>;

export const ResearchModelSchema = z.looseObject({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  approxCostPerVideoUsd: z.number(),
});

export type ResearchModel = z.infer<typeof ResearchModelSchema>;

export const ModelsResponseSchema = z.object({
  data: z.object({ models: z.array(ResearchModelSchema), defaultModel: z.string() }),
});

export type ModelCatalog = z.infer<typeof ModelsResponseSchema>["data"];

export const AnalysisResponseSchema = z.object({ data: AnalysisSchema });
export const AnalysisListResponseSchema = z.object({
  data: z.array(AnalysisSummarySchema),
  pagination: z.object({ limit: z.number(), offset: z.number(), total: z.number() }),
});
export const ApiErrorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: z.string().optional() }),
});

export const IN_PROGRESS_STATUSES: ReadonlySet<AnalysisStatus> = new Set([
  "queued",
  "downloading",
  "transcribing",
  "breaking_down",
  "investigating",
]);

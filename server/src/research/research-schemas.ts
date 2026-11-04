import { z } from "zod";

export const CLAIM_KINDS = [
  "statistic",
  "factual",
  "causal",
  "prediction",
  "advice",
  "anecdote",
  "opinion",
] as const;

export const CLAIM_CENTRALITY = ["core", "supporting", "peripheral"] as const;

export const EVIDENCE_STATUSES = [
  "well_supported",
  "partly_supported",
  "misleading",
  "contested",
  "unsupported",
  "contradicted",
  "unverifiable",
] as const;

export const SOURCE_TYPES = [
  "primary_research",
  "review_or_meta_analysis",
  "official_data",
  "expert_body",
  "fact_check",
  "news",
  "other",
] as const;

export const SOURCE_RELATIONS = ["supports", "contradicts", "adds_context"] as const;

// Structured outputs require every field to be present, so optional values are nullable instead.
export const BreakdownSchema = z.object({
  topic: z.string().describe("The subject, 2-5 words"),
  summary: z.string().describe("Neutral summary of what the video says, max 35 words"),
  coreMessage: z.string().describe("What the creator wants the viewer to believe or do, one sentence, max 20 words"),
  speaker: z.object({
    description: z.string().describe("Who is speaking, as far as the content shows, max 15 words"),
    statedCredentials: z.string().nullable().describe("Max 10 words"),
    interests: z
      .array(z.string())
      .describe("Interests visible in the content (products sold, affiliate links, causes promoted), each a short phrase"),
  }),
  claims: z.array(
    z.object({
      statement: z.string().describe("Self-contained restatement that can be researched without the video, max 25 words"),
      quote: z.string().nullable().describe("Verbatim wording from the transcript, caption or on-screen text"),
      kind: z.enum(CLAIM_KINDS),
      checkable: z.boolean().describe("Whether evidence could in principle confirm or refute it"),
      centrality: z.enum(CLAIM_CENTRALITY),
    }),
  ),
  persuasionTechniques: z.array(
    z.object({
      technique: z.string().describe("Name of the technique, 1-4 words"),
      howItIsUsed: z.string().describe("The specific moment or wording in this video that shows it, max 20 words"),
    }),
  ),
  reflectionQuestions: z.array(z.string().describe("One question, max 20 words")),
  limitations: z.string().nullable().describe("What limited the analysis, such as missing audio, one sentence max 20 words; null if nothing notable"),
});

export type Breakdown = z.infer<typeof BreakdownSchema>;

export const InvestigationSchema = z.object({
  evidenceStatus: z.enum(EVIDENCE_STATUSES),
  confidence: z.enum(["low", "medium", "high"]),
  headline: z.string().describe("Where the evidence stands, one sentence, max 20 words"),
  whatTheEvidenceShows: z.string().describe("The key evidence, 2-3 short sentences, max 60 words, no links"),
  missingContext: z.string().nullable().describe("Context that changes the meaning, max 30 words; null if none"),
  strongestCounterpoint: z.string().nullable().describe("Best case against the verdict, max 30 words; null if none worth noting"),
  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      publisher: z.string(),
      sourceType: z.enum(SOURCE_TYPES),
      relation: z.enum(SOURCE_RELATIONS),
      keyFinding: z.string().describe("What this source says that matters for the claim, max 15 words"),
    }),
  ),
});

export type Investigation = z.infer<typeof InvestigationSchema>;

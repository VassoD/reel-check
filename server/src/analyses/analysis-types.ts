import type { Breakdown, Investigation } from "@/research/research-schemas";
import type { ErrorCode } from "@/lib/errors";

export const ANALYSIS_STATUSES = [
  "queued",
  "downloading",
  "transcribing",
  "breaking_down",
  "investigating",
  "done",
  "failed",
] as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export interface ReelSource {
  author: string | null;
  caption: string | null;
  durationSeconds: number | null;
  postedAt: string | null;
  thumbnailUrl: string | null;
  viewCount: number | null;
  likeCount: number | null;
}

export interface Transcript {
  text: string;
  languages: string[];
}

export type Claim = Breakdown["claims"][number] & { id: string };

export interface ClaimInvestigation {
  claimId: string;
  status: "pending" | "running" | "done" | "failed";
  result: (Investigation & { unverifiedSourceCount: number }) | null;
  errorMessage: string | null;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
}

export interface Analysis {
  id: string;
  sourceUrl: string;
  /** OpenAI model used for the research. */
  model: string;
  status: AnalysisStatus;
  createdAt: string;
  updatedAt: string;
  source: ReelSource | null;
  transcript: Transcript | null;
  breakdown: (Omit<Breakdown, "claims"> & { claims: Claim[] }) | null;
  investigations: ClaimInvestigation[];
  usage: UsageTotals;
  error: { code: ErrorCode; message: string } | null;
}

export interface AnalysisSummary {
  id: string;
  sourceUrl: string;
  status: AnalysisStatus;
  createdAt: string;
  model: string;
  topic: string | null;
  author: string | null;
  thumbnailUrl: string | null;
  claimCount: number;
}

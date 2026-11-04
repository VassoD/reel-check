import type { EvidenceStatus } from "@/features/analyses/analysis-schemas";

interface EvidenceLabel {
  label: string;
  /** Text and border color; the badge background is the same hue at low opacity. */
  tone: { light: string; dark: string };
}

// Wording describes the evidence, never the person: "No good evidence" rather than "False".
export const EVIDENCE_LABELS: Record<EvidenceStatus, EvidenceLabel> = {
  well_supported: { label: "Well supported", tone: { light: "#2E6B3F", dark: "#86CF98" } },
  partly_supported: { label: "Partly supported", tone: { light: "#5E6B1F", dark: "#C4D27A" } },
  misleading: { label: "Misleading framing", tone: { light: "#9A5B00", dark: "#F0B35C" } },
  contested: { label: "Contested", tone: { light: "#5B4A9A", dark: "#B3A5EE" } },
  unsupported: { label: "No good evidence", tone: { light: "#8A4B2E", dark: "#E7A385" } },
  contradicted: { label: "Contradicted", tone: { light: "#A1352B", dark: "#F08A7E" } },
  unverifiable: { label: "Can't be verified", tone: { light: "#5F5A52", dark: "#B5ADA1" } },
};

export const CLAIM_KIND_LABELS: Record<string, string> = {
  statistic: "Statistic",
  factual: "Fact",
  causal: "Cause and effect",
  prediction: "Prediction",
  advice: "Advice",
  anecdote: "Personal story",
  opinion: "Opinion",
};

export const SOURCE_RELATION_LABELS = {
  supports: "Supports",
  contradicts: "Contradicts",
  adds_context: "Context",
} as const;

export const STATUS_STEPS = [
  { status: "downloading", label: "Fetching the video" },
  { status: "transcribing", label: "Listening to the audio" },
  { status: "breaking_down", label: "Finding the claims" },
  { status: "investigating", label: "Researching each claim" },
] as const;

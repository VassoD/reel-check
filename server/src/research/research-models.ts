import { config } from "@/config";

export interface ResearchModel {
  id: string;
  label: string;
  description: string;
  /** Rough cost of one typical video (about 200k input and 10k output tokens, plus web searches), in USD. */
  approxCostPerVideoUsd: number;
}

// All four were checked against this pipeline's needs: Responses API web search, structured output and reasoning effort.
export const RESEARCH_MODELS: readonly ResearchModel[] = [
  {
    id: "gpt-6-astra",
    label: "Astra",
    description: "Most thorough research, slowest and priciest",
    approxCostPerVideoUsd: 2.6,
  },
  {
    id: "gpt-6.1-sol",
    label: "Sol",
    description: "Near-Astra quality at a fifth of the price",
    approxCostPerVideoUsd: 0.6,
  },
  {
    id: "gpt-6.1-terra",
    label: "Terra",
    description: "Faster and cheaper, a bit less careful",
    approxCostPerVideoUsd: 0.35,
  },
  {
    id: "gpt-6-luna",
    label: "Luna",
    description: "Cheapest and fastest, best for quick checks",
    approxCostPerVideoUsd: 0.15,
  },
];

export const RESEARCH_MODEL_IDS = RESEARCH_MODELS.map((model) => model.id);

/** Analyses saved before models were selectable ran on the default at the time. */
export const LEGACY_DEFAULT_MODEL = "gpt-6.1-sol";

export function defaultResearchModel(): string {
  return config.RESEARCH_MODEL;
}

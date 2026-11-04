import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import {
  IN_PROGRESS_STATUSES,
  type Analysis,
  type AnalysisSummary,
  type ModelCatalog,
  type ResearchModel,
} from "@/features/analyses/analysis-schemas";
import {
  createAnalysis,
  fetchAnalyses,
  fetchAnalysis,
  fetchModels,
  type CreateAnalysisInput,
} from "@/features/analyses/api-client";
import { useSettings } from "@/features/settings/SettingsProvider";

const POLL_INTERVAL_MS = 2_500;
const MODELS_STALE_TIME_MS = 60 * 60_000;

export const analysisKeys = {
  all: ["analyses"] as const,
  list: () => [...analysisKeys.all, "list"] as const,
  detail: (id: string) => [...analysisKeys.all, "detail", id] as const,
  models: () => ["models"] as const,
};

export function useAnalysis(id: string): UseQueryResult<Analysis> {
  const { settings } = useSettings();
  return useQuery({
    queryKey: analysisKeys.detail(id),
    queryFn: ({ signal }) => {
      if (!settings) throw new Error("Server settings are missing.");
      return fetchAnalysis(settings, id, signal);
    },
    enabled: settings !== null,
    // Keep polling only while the server is still working on it.
    refetchInterval: (query) =>
      query.state.data && !IN_PROGRESS_STATUSES.has(query.state.data.status) ? false : POLL_INTERVAL_MS,
  });
}

export function useAnalyses(): UseQueryResult<AnalysisSummary[]> {
  const { settings } = useSettings();
  return useQuery({
    queryKey: analysisKeys.list(),
    queryFn: ({ signal }) => {
      if (!settings) throw new Error("Server settings are missing.");
      return fetchAnalyses(settings, signal);
    },
    enabled: settings !== null,
    refetchInterval: (query) =>
      query.state.data?.some((summary) => IN_PROGRESS_STATUSES.has(summary.status)) ? POLL_INTERVAL_MS : false,
  });
}

export function useModels(): UseQueryResult<ModelCatalog> {
  const { settings } = useSettings();
  return useQuery({
    queryKey: analysisKeys.models(),
    queryFn: ({ signal }) => {
      if (!settings) throw new Error("Server settings are missing.");
      return fetchModels(settings, signal);
    },
    enabled: settings !== null,
    staleTime: MODELS_STALE_TIME_MS,
  });
}

/** Looks up a model's display details; null while the catalog loads or for a model the server no longer offers. */
export function useModelDetails(modelId: string | null | undefined): ResearchModel | null {
  const { data } = useModels();
  return data?.models.find((model) => model.id === modelId) ?? null;
}

/** Uses the model chosen in Settings unless the caller picks one. */
export function useCreateAnalysis(): UseMutationResult<Analysis, Error, CreateAnalysisInput> {
  const { settings, preferredModel } = useSettings();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnalysisInput) => {
      if (!settings) throw new Error("Set up the server in Settings first.");
      return createAnalysis(settings, { ...input, model: input.model ?? preferredModel ?? undefined });
    },
    onSuccess: (analysis) => {
      queryClient.setQueryData(analysisKeys.detail(analysis.id), analysis);
      void queryClient.invalidateQueries({ queryKey: analysisKeys.list() });
    },
  });
}

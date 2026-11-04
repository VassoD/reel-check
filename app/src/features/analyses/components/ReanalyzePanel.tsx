import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { Analysis } from "@/features/analyses/analysis-schemas";
import { useCreateAnalysis, useModels } from "@/features/analyses/analysis-queries";
import { describeError } from "@/features/analyses/api-client";
import { formatCost, ModelPicker } from "@/features/analyses/components/ModelPicker";
import { useSettings } from "@/features/settings/SettingsProvider";
import { useToast } from "@/ui/ToastProvider";
import { FONT, RADIUS, SPACING, usePalette } from "@/ui/theme";

/** Runs the same video again, optionally with another model. The old analysis stays in the history. */
export function ReanalyzePanel({ analysis }: { analysis: Analysis }): ReactNode {
  const palette = usePalette();
  const router = useRouter();
  const { showToast } = useToast();
  const { preferredModel } = useSettings();
  const models = useModels();
  const createAnalysis = useCreateAnalysis();
  const [isOpen, setIsOpen] = useState(false);
  const [pickedModel, setPickedModel] = useState<string | null>(null);

  const selectedId = pickedModel ?? preferredModel ?? analysis.model ?? models.data?.defaultModel ?? "";
  const selected = models.data?.models.find((model) => model.id === selectedId);

  const run = (): void => {
    createAnalysis.mutate(
      { sharedText: analysis.sourceUrl, model: selectedId, refresh: true },
      {
        onSuccess: (next) => router.replace({ pathname: "/analysis/[id]", params: { id: next.id } }),
        onError: (error) => showToast(describeError(error)),
      },
    );
  };

  if (!isOpen) {
    return (
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        style={[styles.secondaryButton, { borderColor: palette.border }]}
      >
        <Text style={[styles.secondaryText, { color: palette.accent }]}>Re-analyze</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.panel, { backgroundColor: palette.surfaceMuted }]}>
      <Text style={[styles.title, { color: palette.text }]}>Re-analyze with</Text>
      {models.data ? (
        <ModelPicker models={models.data.models} selectedId={selectedId} onSelect={setPickedModel} />
      ) : models.error ? (
        <Text style={[styles.hint, { color: palette.danger }]}>{describeError(models.error)}</Text>
      ) : (
        <ActivityIndicator color={palette.accent} />
      )}
      <View style={styles.actions}>
        <Pressable onPress={() => setIsOpen(false)} accessibilityRole="button" style={styles.cancel} hitSlop={SPACING.sm}>
          <Text style={[styles.secondaryText, { color: palette.textMuted }]}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={run}
          disabled={!selected || createAnalysis.isPending}
          accessibilityRole="button"
          style={[styles.primaryButton, { backgroundColor: palette.accent, opacity: selected ? 1 : 0.5 }]}
        >
          {createAnalysis.isPending ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={[styles.primaryText, { color: palette.accentText }]}>
              {selected ? `Run with ${selected.label} (${formatCost(selected.approxCostPerVideoUsd)})` : "Run"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md },
  title: { fontSize: FONT.sizeMd, fontWeight: "700" },
  hint: { fontSize: FONT.sizeSm },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: SPACING.lg },
  cancel: { paddingVertical: SPACING.md },
  primaryButton: { flex: 1, borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: "center" },
  primaryText: { fontSize: FONT.sizeMd, fontWeight: "700" },
  secondaryButton: { borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: "center" },
  secondaryText: { fontSize: FONT.sizeMd, fontWeight: "700" },
});

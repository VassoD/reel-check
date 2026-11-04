import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useModels } from "@/features/analyses/analysis-queries";
import { describeError } from "@/features/analyses/api-client";
import { ModelPicker } from "@/features/analyses/components/ModelPicker";
import { useSettings } from "@/features/settings/SettingsProvider";
import { useToast } from "@/ui/ToastProvider";
import { FONT, SPACING, usePalette } from "@/ui/theme";

/** The model used for Reels you share or paste. Saved as soon as you pick one. */
export function ModelPreference(): ReactNode {
  const palette = usePalette();
  const { showToast } = useToast();
  const { preferredModel, updatePreferredModel } = useSettings();
  const models = useModels();

  const select = async (modelId: string): Promise<void> => {
    try {
      await updatePreferredModel(modelId);
    } catch {
      showToast("Could not save the model choice.");
    }
  };

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.text }]}>Model for new analyses</Text>
      {models.data ? (
        <ModelPicker
          models={models.data.models}
          selectedId={preferredModel ?? models.data.defaultModel}
          onSelect={(modelId) => void select(modelId)}
        />
      ) : models.error ? (
        <Text style={[styles.hint, { color: palette.danger }]}>{describeError(models.error)}</Text>
      ) : (
        <ActivityIndicator color={palette.accent} />
      )}
      <Text style={[styles.hint, { color: palette.textMuted }]}>
        Costs are rough estimates for a typical Reel. You can re-run any analysis with another model from its report.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.sm },
  label: { fontSize: FONT.sizeSm, fontWeight: "700" },
  hint: { fontSize: FONT.sizeSm, lineHeight: 20 },
});

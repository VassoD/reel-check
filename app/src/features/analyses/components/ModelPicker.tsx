import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ResearchModel } from "@/features/analyses/analysis-schemas";
import { FONT, RADIUS, SPACING, usePalette } from "@/ui/theme";

const RADIO_SIZE = 20;
const RADIO_DOT_SIZE = 10;

export function formatCost(usd: number): string {
  return `~$${usd.toFixed(2)}`;
}

interface ModelPickerProps {
  models: ResearchModel[];
  selectedId: string;
  onSelect: (modelId: string) => void;
}

export const ModelPicker = memo(function ModelPicker({ models, selectedId, onSelect }: ModelPickerProps): ReactNode {
  const palette = usePalette();
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {models.map((model) => {
        const isSelected = model.id === selectedId;
        return (
          <Pressable
            key={model.id}
            onPress={() => onSelect(model.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.option,
              {
                backgroundColor: palette.surface,
                borderColor: isSelected ? palette.accent : palette.border,
              },
            ]}
          >
            <View style={[styles.radio, { borderColor: isSelected ? palette.accent : palette.border }]}>
              {isSelected && <View style={[styles.radioDot, { backgroundColor: palette.accent }]} />}
            </View>
            <View style={styles.text}>
              <View style={styles.titleRow}>
                <Text style={[styles.label, { color: palette.text }]}>{model.label}</Text>
                <Text style={[styles.cost, { color: palette.textMuted }]}>{formatCost(model.approxCostPerVideoUsd)} / video</Text>
              </View>
              <Text style={[styles.description, { color: palette.textMuted }]}>{model.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  list: { gap: SPACING.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: RADIO_DOT_SIZE, height: RADIO_DOT_SIZE, borderRadius: RADIO_DOT_SIZE / 2 },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  label: { fontSize: FONT.sizeMd, fontWeight: "700" },
  cost: { fontSize: FONT.sizeXs, fontWeight: "600" },
  description: { fontSize: FONT.sizeSm, lineHeight: 19 },
});

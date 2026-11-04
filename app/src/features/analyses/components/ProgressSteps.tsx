import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { Analysis } from "@/features/analyses/analysis-schemas";
import { STATUS_STEPS } from "@/features/analyses/evidence-labels";
import { FONT, RADIUS, SPACING, usePalette } from "@/ui/theme";

const STEP_ORDER: string[] = ["queued", ...STATUS_STEPS.map((step) => step.status), "done"];

export function ProgressSteps({ analysis }: { analysis: Analysis }): ReactNode {
  const palette = usePalette();
  const currentIndex = STEP_ORDER.indexOf(analysis.status);
  const researched = analysis.investigations.filter((entry) => entry.status === "done" || entry.status === "failed");

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {STATUS_STEPS.map((step) => {
        const stepIndex = STEP_ORDER.indexOf(step.status);
        const isDone = currentIndex > stepIndex;
        const isActive = currentIndex === stepIndex;
        const suffix =
          step.status === "investigating" && analysis.investigations.length > 0
            ? ` (${researched.length}/${analysis.investigations.length})`
            : "";
        return (
          <View key={step.status} style={styles.row}>
            <View style={styles.marker}>
              {isActive ? (
                <ActivityIndicator size="small" color={palette.accent} />
              ) : (
                <Text style={{ color: isDone ? palette.accent : palette.border, fontSize: FONT.sizeMd }}>
                  {isDone ? "✓" : "○"}
                </Text>
              )}
            </View>
            <Text style={[styles.label, { color: isDone || isActive ? palette.text : palette.textMuted }]}>
              {step.label}
              {suffix}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  marker: { width: 22, alignItems: "center" },
  label: { fontSize: FONT.sizeSm },
});

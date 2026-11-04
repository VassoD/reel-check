import { memo, type ReactNode } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import type { EvidenceStatus } from "@/features/analyses/analysis-schemas";
import { EVIDENCE_LABELS } from "@/features/analyses/evidence-labels";
import { FONT, RADIUS, SPACING } from "@/ui/theme";

const BACKGROUND_ALPHA_HEX = "1F";

export const EvidenceBadge = memo(function EvidenceBadge({ status }: { status: EvidenceStatus }): ReactNode {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const { label, tone } = EVIDENCE_LABELS[status];
  const color = tone[scheme];
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}${BACKGROUND_ALPHA_HEX}` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  text: { fontSize: FONT.sizeXs, fontWeight: "700" },
});

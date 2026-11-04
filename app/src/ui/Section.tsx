import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FONT, SPACING, usePalette } from "@/ui/theme";

interface SectionProps {
  title: string;
  hint?: string;
  children: ReactNode;
}

export function Section({ title, hint, children }: SectionProps): ReactNode {
  const palette = usePalette();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.textMuted }]}>
        {title.toUpperCase()}
      </Text>
      {hint && <Text style={[styles.hint, { color: palette.textMuted }]}>{hint}</Text>}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: SPACING.xxl },
  title: { fontSize: FONT.sizeXs, fontWeight: "700", letterSpacing: 1.2 },
  hint: { fontSize: FONT.sizeSm, marginTop: SPACING.xs },
  body: { marginTop: SPACING.md, gap: SPACING.md },
});

import { Image } from "expo-image";
import { Link } from "expo-router";
import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IN_PROGRESS_STATUSES, type AnalysisSummary } from "@/features/analyses/analysis-schemas";
import { useModelDetails } from "@/features/analyses/analysis-queries";
import { FONT, RADIUS, SPACING, usePalette } from "@/ui/theme";

const THUMBNAIL_SIZE = 64;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export const AnalysisListItem = memo(function AnalysisListItem({ summary }: { summary: AnalysisSummary }): ReactNode {
  const palette = usePalette();
  const isWorking = IN_PROGRESS_STATUSES.has(summary.status);
  const modelLabel = useModelDetails(summary.model)?.label;
  const subtitle =
    summary.status === "failed"
      ? "Failed. Tap for details"
      : isWorking
        ? "Researching…"
        : [`${summary.claimCount} claims`, modelLabel, formatDate(summary.createdAt)].filter(Boolean).join(" · ");

  return (
    <Link href={{ pathname: "/analysis/[id]", params: { id: summary.id } }} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {summary.thumbnailUrl ? (
          <Image source={{ uri: summary.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.thumbnail, { backgroundColor: palette.surfaceMuted }]} />
        )}
        <View style={styles.text}>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
            {summary.topic ?? summary.sourceUrl}
          </Text>
          <Text style={[styles.meta, { color: summary.status === "failed" ? palette.danger : palette.textMuted }]}>
            {summary.author ? `${summary.author} · ` : ""}
            {subtitle}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
  },
  thumbnail: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, borderRadius: RADIUS.md },
  text: { flex: 1, gap: SPACING.xs },
  title: { fontSize: FONT.sizeMd, fontWeight: "600", lineHeight: 21 },
  meta: { fontSize: FONT.sizeXs },
});

import { useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IN_PROGRESS_STATUSES } from "@/features/analyses/analysis-schemas";
import { useAnalysis } from "@/features/analyses/analysis-queries";
import { describeError } from "@/features/analyses/api-client";
import { AnalysisReport } from "@/features/analyses/components/AnalysisReport";
import { ReanalyzePanel } from "@/features/analyses/components/ReanalyzePanel";
import { Skeleton } from "@/ui/Skeleton";
import { FONT, SPACING, usePalette } from "@/ui/theme";

export default function AnalysisScreen(): ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { data: analysis, error, isPending, isRefetching, refetch } = useAnalysis(id);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xxl }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      {analysis && <AnalysisReport analysis={analysis} />}
      {analysis && !IN_PROGRESS_STATUSES.has(analysis.status) && (
        <View style={styles.reanalyze}>
          <ReanalyzePanel key={analysis.id} analysis={analysis} />
        </View>
      )}
      {isPending && (
        <View style={styles.loading}>
          <Skeleton width="70%" height={26} />
          <Skeleton />
          <Skeleton width="90%" />
          <Skeleton height={120} />
        </View>
      )}
      {error && !analysis && (
        <Text style={[styles.error, { color: palette.danger }]}>{describeError(error)}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  loading: { gap: SPACING.md },
  reanalyze: { marginTop: SPACING.xxl },
  error: { fontSize: FONT.sizeMd, lineHeight: 23 },
});

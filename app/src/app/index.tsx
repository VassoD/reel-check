import { Link, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAnalyses, useCreateAnalysis } from "@/features/analyses/analysis-queries";
import { describeError } from "@/features/analyses/api-client";
import { AnalysisListItem } from "@/features/analyses/components/AnalysisListItem";
import { useSettings } from "@/features/settings/SettingsProvider";
import { Skeleton } from "@/ui/Skeleton";
import { useToast } from "@/ui/ToastProvider";
import { FONT, RADIUS, SPACING, usePalette } from "@/ui/theme";

function SetupPrompt(): ReactNode {
  const palette = usePalette();
  return (
    <View style={[styles.setup, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.heading, { color: palette.text }]}>Connect your server</Text>
      <Text style={[styles.body, { color: palette.textMuted }]}>
        Reel Check sends what you share to the research server running on your computer. Add its address and access
        token to get started.
      </Text>
      <Link href="/settings" asChild>
        <Pressable style={[styles.button, { backgroundColor: palette.accent }]}>
          <Text style={[styles.buttonText, { color: palette.accentText }]}>Set up</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function PasteBox(): ReactNode {
  const palette = usePalette();
  const router = useRouter();
  const { showToast } = useToast();
  const createAnalysis = useCreateAnalysis();
  const [text, setText] = useState("");

  const submit = (): void => {
    if (!text.trim()) return;
    createAnalysis.mutate({ sharedText: text }, {
      onSuccess: (analysis) => {
        setText("");
        router.push({ pathname: "/analysis/[id]", params: { id: analysis.id } });
      },
      onError: (error) => showToast(describeError(error)),
    });
  };

  return (
    <View style={styles.paste}>
      <Text style={[styles.body, { color: palette.textMuted }]}>
        Share a Reel from Instagram to Reel Check, or paste a link here.
      </Text>
      <View style={styles.pasteRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          placeholder="https://www.instagram.com/reel/…"
          placeholderTextColor={palette.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          accessibilityLabel="Reel link"
          style={[styles.input, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]}
        />
        <Pressable
          onPress={submit}
          disabled={createAnalysis.isPending}
          accessibilityRole="button"
          accessibilityLabel="Check this Reel"
          style={[styles.button, { backgroundColor: palette.accent }]}
        >
          {createAnalysis.isPending ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={[styles.buttonText, { color: palette.accentText }]}>Check</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ListSkeleton(): ReactNode {
  return (
    <View style={styles.listSkeleton}>
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} height={88} />
      ))}
    </View>
  );
}

export default function HomeScreen(): ReactNode {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { settings, isLoading: isLoadingSettings } = useSettings();
  const analyses = useAnalyses();

  if (isLoadingSettings) return <ListSkeleton />;

  return (
    <FlatList
      data={settings ? (analyses.data ?? []) : []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AnalysisListItem summary={item} />}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xxl }]}
      ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
      refreshControl={
        <RefreshControl refreshing={analyses.isRefetching} onRefresh={() => void analyses.refetch()} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {settings ? <PasteBox /> : <SetupPrompt />}
          <Link href="/settings" style={[styles.settingsLink, { color: palette.accent }]}>
            Server settings
          </Link>
          {settings && <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>HISTORY</Text>}
        </View>
      }
      ListEmptyComponent={
        settings ? (
          analyses.isPending ? (
            <ListSkeleton />
          ) : analyses.error ? (
            <Text style={[styles.body, { color: palette.danger }]}>{describeError(analyses.error)}</Text>
          ) : (
            <Text style={[styles.body, { color: palette.textMuted }]}>Nothing checked yet.</Text>
          )
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg },
  header: { gap: SPACING.lg, marginBottom: SPACING.md },
  setup: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.xl, gap: SPACING.md },
  heading: { fontFamily: "serif", fontSize: FONT.sizeXl, fontWeight: "700" },
  body: { fontSize: FONT.sizeMd, lineHeight: 23 },
  paste: { gap: SPACING.md },
  pasteRow: { flexDirection: "row", gap: SPACING.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT.sizeSm,
  },
  button: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
  },
  buttonText: { fontSize: FONT.sizeSm, fontWeight: "700" },
  settingsLink: { fontSize: FONT.sizeSm, fontWeight: "600" },
  sectionTitle: { fontSize: FONT.sizeXs, fontWeight: "700", letterSpacing: 1.2, marginTop: SPACING.md },
  listSkeleton: { gap: SPACING.md, padding: SPACING.lg },
});

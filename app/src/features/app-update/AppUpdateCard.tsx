import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { describeError } from "@/features/analyses/api-client";
import {
  downloadAndInstallUpdate,
  fetchLatestRelease,
  installedVersionCode,
  installedVersionName,
  type LatestRelease,
} from "@/features/app-update/app-update-api";
import { useSettings } from "@/features/settings/SettingsProvider";
import { FONT, RADIUS, SPACING, usePalette } from "@/ui/theme";

const BYTES_PER_MB = 1_000_000;

function useLatestRelease(): UseQueryResult<LatestRelease | null> {
  const { settings } = useSettings();
  return useQuery({
    queryKey: ["app-update", "latest"],
    queryFn: ({ signal }) => {
      if (!settings) throw new Error("Server settings are missing.");
      return fetchLatestRelease(settings, signal);
    },
    enabled: settings !== null,
  });
}

export function AppUpdateCard(): ReactNode {
  const palette = usePalette();
  const { settings } = useSettings();
  const latest = useLatestRelease();
  const [progress, setProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const release = latest.data;
  const isUpdateAvailable = release != null && release.versionCode > installedVersionCode();
  const isDownloading = progress !== null;

  const install = async (): Promise<void> => {
    if (!settings) return;
    setErrorMessage(null);
    setProgress(0);
    try {
      await downloadAndInstallUpdate(settings, setProgress);
    } catch (error) {
      setErrorMessage(describeError(error));
    } finally {
      setProgress(null);
    }
  };

  const status = latest.isFetching
    ? "Checking for updates…"
    : latest.error
      ? describeError(latest.error)
      : isUpdateAvailable
        ? `Version ${release.versionName} is ready (${Math.round(release.sizeBytes / BYTES_PER_MB)} MB).`
        : "You have the latest version.";

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.text }]}>App version</Text>
      <Text style={[styles.body, { color: palette.textMuted }]}>
        {`Installed: ${installedVersionName()} (${installedVersionCode()}). ${status}`}
      </Text>

      {errorMessage && <Text style={[styles.body, { color: palette.danger }]}>{errorMessage}</Text>}

      {isUpdateAvailable ? (
        <Pressable
          onPress={() => void install()}
          disabled={isDownloading}
          accessibilityRole="button"
          style={[styles.primaryButton, { backgroundColor: palette.accent }]}
        >
          {isDownloading ? (
            <View style={styles.progressRow}>
              <ActivityIndicator color={palette.accentText} />
              <Text style={[styles.primaryText, { color: palette.accentText }]}>
                {`Downloading ${Math.round((progress ?? 0) * 100)}%`}
              </Text>
            </View>
          ) : (
            <Text style={[styles.primaryText, { color: palette.accentText }]}>Download and install</Text>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={() => void latest.refetch()}
          disabled={latest.isFetching}
          accessibilityRole="button"
          style={[styles.secondaryButton, { borderColor: palette.border }]}
        >
          <Text style={[styles.secondaryText, { color: palette.accent }]}>Check for updates</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.sm },
  label: { fontSize: FONT.sizeSm, fontWeight: "700" },
  body: { fontSize: FONT.sizeSm, lineHeight: 20 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  primaryButton: { borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: "center" },
  primaryText: { fontSize: FONT.sizeMd, fontWeight: "700" },
  secondaryButton: { borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: "center" },
  secondaryText: { fontSize: FONT.sizeMd, fontWeight: "700" },
});

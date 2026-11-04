import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { describeError, verifyConnection } from "@/features/analyses/api-client";
import { AppUpdateCard } from "@/features/app-update/AppUpdateCard";
import { ModelPreference } from "@/features/settings/ModelPreference";
import { useSettings } from "@/features/settings/SettingsProvider";
import { normalizeBaseUrl } from "@/features/settings/settings-storage";
import { useToast } from "@/ui/ToastProvider";
import { FONT, RADIUS, SPACING, usePalette } from "@/ui/theme";

const WHITESPACE_PATTERN = /\s+/g;

export default function SettingsScreen(): ReactNode {
  const palette = usePalette();
  const router = useRouter();
  const { showToast } = useToast();
  const { settings, updateSettings } = useSettings();
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl ?? "");
  const [token, setToken] = useState(settings?.token ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    // Pasted tokens often pick up spaces or line breaks, and a real token never contains whitespace.
    const next = { baseUrl: normalizeBaseUrl(baseUrl), token: token.replace(WHITESPACE_PATTERN, "") };
    if (!next.baseUrl || !next.token) {
      setErrorMessage("Both the address and the token are needed.");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await verifyConnection(next);
      await updateSettings(next);
      showToast("Connected.");
      router.back();
    } catch (error) {
      setErrorMessage(describeError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = [styles.input, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.body, { color: palette.textMuted }]}>
        Run the server on your computer, then enter its address on your Wi-Fi network (for example
        192.168.1.20:8787) and the APP_TOKEN from its .env file.
      </Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: palette.text }]}>Server address</Text>
        <TextInput
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder="192.168.1.20:8787"
          placeholderTextColor={palette.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={inputStyle}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: palette.text }]}>Access token</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="APP_TOKEN"
          placeholderTextColor={palette.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!isTokenVisible}
          style={inputStyle}
        />
        <Pressable onPress={() => setIsTokenVisible((visible) => !visible)} accessibilityRole="button" hitSlop={SPACING.sm}>
          <Text style={[styles.toggle, { color: palette.accent }]}>{isTokenVisible ? "Hide token" : "Show token"}</Text>
        </Pressable>
      </View>

      {errorMessage && <Text style={[styles.body, { color: palette.danger }]}>{errorMessage}</Text>}

      <Pressable
        onPress={() => void save()}
        disabled={isSaving}
        accessibilityRole="button"
        style={[styles.button, { backgroundColor: palette.accent }]}
      >
        {isSaving ? (
          <ActivityIndicator color={palette.accentText} />
        ) : (
          <Text style={[styles.buttonText, { color: palette.accentText }]}>Test and save</Text>
        )}
      </Pressable>

      {settings && (
        <View style={[styles.divider, { borderTopColor: palette.border }]}>
          <ModelPreference />
        </View>
      )}

      {settings && (
        <View style={[styles.divider, { borderTopColor: palette.border }]}>
          <AppUpdateCard />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, gap: SPACING.xl },
  body: { fontSize: FONT.sizeMd, lineHeight: 23 },
  field: { gap: SPACING.sm },
  label: { fontSize: FONT.sizeSm, fontWeight: "700" },
  toggle: { fontSize: FONT.sizeSm, fontWeight: "600", alignSelf: "flex-start" },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT.sizeMd,
  },
  button: { borderRadius: RADIUS.md, paddingVertical: SPACING.lg, alignItems: "center" },
  buttonText: { fontSize: FONT.sizeMd, fontWeight: "700" },
  divider: { borderTopWidth: 1, paddingTop: SPACING.xl },
});

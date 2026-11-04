import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { ShareIntentProvider } from "expo-share-intent";
import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApiError, NetworkError } from "@/features/analyses/api-client";
import { SettingsProvider } from "@/features/settings/SettingsProvider";
import { ShareIntentHandler } from "@/features/share/ShareIntentHandler";
import { ToastProvider } from "@/ui/ToastProvider";
import { usePalette } from "@/ui/theme";

const MAX_QUERY_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 10_000;

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Only transient failures are worth retrying; a 401 or 404 will not fix itself.
        retry: (failureCount, error) =>
          failureCount < MAX_QUERY_RETRIES &&
          (error instanceof NetworkError || (error instanceof ApiError && error.isRetryable)),
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, MAX_RETRY_DELAY_MS),
      },
    },
  });
}

export default function RootLayout(): ReactNode {
  const [queryClient] = useState(createQueryClient);
  const palette = usePalette();

  return (
    // The share intent provider must wrap everything else, per expo-share-intent's docs.
    <ShareIntentProvider options={{ resetOnBackground: true }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SettingsProvider>
            <ToastProvider>
              <ShareIntentHandler />
              <StatusBar style="auto" />
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: palette.background },
                  headerTintColor: palette.text,
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: palette.background },
                }}
              >
                <Stack.Screen name="index" options={{ title: "Reel Check" }} />
                <Stack.Screen name="analysis/[id]" options={{ title: "" }} />
                <Stack.Screen name="settings" options={{ title: "Settings" }} />
              </Stack>
            </ToastProvider>
          </SettingsProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}

import { useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useEffect, useRef, type ReactNode } from "react";
import { useCreateAnalysis } from "@/features/analyses/analysis-queries";
import { describeError } from "@/features/analyses/api-client";
import { useSettings } from "@/features/settings/SettingsProvider";
import { useToast } from "@/ui/ToastProvider";

/**
 * Lives in the root layout so a Reel shared from Instagram is picked up whichever screen is open,
 * including when the app was already running in the background.
 */
export function ShareIntentHandler(): ReactNode {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntentContext();
  const { settings, isLoading } = useSettings();
  const createAnalysis = useCreateAnalysis();
  const { showToast } = useToast();
  const handledText = useRef<string | null>(null);

  useEffect(() => {
    if (error) showToast(`Could not read what was shared: ${error}`);
  }, [error, showToast]);

  useEffect(() => {
    if (!hasShareIntent || isLoading) return;
    const sharedText = shareIntent.webUrl ?? shareIntent.text;
    if (!sharedText || handledText.current === sharedText) return;
    handledText.current = sharedText;

    if (!settings) {
      showToast("Connect to your server first, then share the Reel again.");
      resetShareIntent();
      router.push("/settings");
      return;
    }

    createAnalysis.mutate({ sharedText }, {
      onSuccess: (analysis) => router.push({ pathname: "/analysis/[id]", params: { id: analysis.id } }),
      onError: (mutationError) => showToast(describeError(mutationError)),
      onSettled: () => {
        handledText.current = null;
        resetShareIntent();
      },
    });
    // createAnalysis is a new object every render; depending on it would resubmit the same share.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, isLoading, settings, shareIntent.webUrl, shareIntent.text]);

  return null;
}

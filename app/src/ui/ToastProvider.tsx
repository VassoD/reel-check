import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT, RADIUS, SPACING, usePalette } from "@/ui/theme";

const TOAST_DURATION_MS = 4_000;

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const showToast = useCallback((next: string): void => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), TOAST_DURATION_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.toast, { bottom: insets.bottom + SPACING.lg, backgroundColor: palette.text }]}
        >
          <Text style={[styles.text, { color: palette.background }]}>{message}</Text>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: SPACING.lg,
    right: SPACING.lg,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  text: { fontSize: FONT.sizeSm, lineHeight: 20 },
});

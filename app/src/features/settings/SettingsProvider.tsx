import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loadPreferredModel,
  loadServerSettings,
  savePreferredModel,
  saveServerSettings,
  type ServerSettings,
} from "@/features/settings/settings-storage";

interface SettingsContextValue {
  settings: ServerSettings | null;
  isLoading: boolean;
  updateSettings: (settings: ServerSettings) => Promise<void>;
  /** Model for new analyses; null means the server's default. */
  preferredModel: string | null;
  updatePreferredModel: (model: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }): ReactNode {
  const [settings, setSettings] = useState<ServerSettings | null>(null);
  const [preferredModel, setPreferredModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const load = async (): Promise<void> => {
      try {
        const [stored, storedModel] = await Promise.all([loadServerSettings(), loadPreferredModel()]);
        if (!isActive) return;
        setSettings(stored);
        setPreferredModel(storedModel);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    void load();
    return () => {
      isActive = false;
    };
  }, []);

  const updateSettings = useCallback(async (next: ServerSettings): Promise<void> => {
    await saveServerSettings(next);
    setSettings(next);
  }, []);

  const updatePreferredModel = useCallback(async (model: string): Promise<void> => {
    await savePreferredModel(model);
    setPreferredModel(model);
  }, []);

  const value = useMemo(
    () => ({ settings, isLoading, updateSettings, preferredModel, updatePreferredModel }),
    [settings, isLoading, updateSettings, preferredModel, updatePreferredModel],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}

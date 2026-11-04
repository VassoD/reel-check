import * as SecureStore from "expo-secure-store";

const BASE_URL_KEY = "server.baseUrl";
const TOKEN_KEY = "server.token";
const PREFERRED_MODEL_KEY = "analysis.model";

export interface ServerSettings {
  baseUrl: string;
  token: string;
}

export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export async function loadServerSettings(): Promise<ServerSettings | null> {
  const [baseUrl, token] = await Promise.all([
    SecureStore.getItemAsync(BASE_URL_KEY),
    SecureStore.getItemAsync(TOKEN_KEY),
  ]);
  return baseUrl && token ? { baseUrl, token } : null;
}

export async function saveServerSettings(settings: ServerSettings): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(BASE_URL_KEY, settings.baseUrl),
    SecureStore.setItemAsync(TOKEN_KEY, settings.token),
  ]);
}

export async function loadPreferredModel(): Promise<string | null> {
  return SecureStore.getItemAsync(PREFERRED_MODEL_KEY);
}

export async function savePreferredModel(model: string): Promise<void> {
  await SecureStore.setItemAsync(PREFERRED_MODEL_KEY, model);
}

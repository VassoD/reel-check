import { useColorScheme } from "react-native";

export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  danger: string;
}

const LIGHT: Palette = {
  background: "#F4EFE6",
  surface: "#FFFDF8",
  surfaceMuted: "#EBE4D8",
  border: "#DDD4C4",
  text: "#1D1A16",
  textMuted: "#6B6358",
  accent: "#1F4D3F",
  accentText: "#FFFDF8",
  danger: "#A1352B",
};

const DARK: Palette = {
  background: "#14120F",
  surface: "#1E1B17",
  surfaceMuted: "#2A2621",
  border: "#3A342D",
  text: "#F2ECE2",
  textMuted: "#A39A8D",
  accent: "#7DC4A8",
  accentText: "#10241D",
  danger: "#E58A7F",
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const RADIUS = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const FONT = {
  serif: "serif",
  sizeXs: 12,
  sizeSm: 14,
  sizeMd: 16,
  sizeLg: 19,
  sizeXl: 24,
} as const;

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? DARK : LIGHT;
}

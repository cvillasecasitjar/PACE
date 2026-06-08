export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  bg: string;
  bgElevated: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryText: string;
  // Traffic-light semantics used across the decision engine & budgets.
  green: string;
  yellow: string;
  red: string;
  greenSoft: string;
  yellowSoft: string;
  redSoft: string;
  overlay: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  font: { regular: string; medium: string; bold: string };
}

const spacing = (n: number) => n * 4;
const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
const font = {
  regular: "System",
  medium: "System",
  bold: "System",
};

export const darkTheme: Theme = {
  mode: "dark",
  spacing,
  radius,
  font,
  colors: {
    bg: "#0B1020",
    bgElevated: "#121933",
    card: "#161E3D",
    cardAlt: "#1E274A",
    border: "#28315A",
    text: "#F5F7FF",
    textMuted: "#A6AEC9",
    textFaint: "#6B7396",
    primary: "#6C5CE7",
    primaryText: "#FFFFFF",
    green: "#34D399",
    yellow: "#FBBF24",
    red: "#FB7185",
    greenSoft: "rgba(52,211,153,0.15)",
    yellowSoft: "rgba(251,191,36,0.15)",
    redSoft: "rgba(251,113,133,0.15)",
    overlay: "rgba(0,0,0,0.5)",
  },
};

export const lightTheme: Theme = {
  mode: "light",
  spacing,
  radius,
  font,
  colors: {
    bg: "#F4F6FB",
    bgElevated: "#FFFFFF",
    card: "#FFFFFF",
    cardAlt: "#EEF1F8",
    border: "#E2E7F0",
    text: "#0B1020",
    textMuted: "#5A6378",
    textFaint: "#9AA2B6",
    primary: "#6C5CE7",
    primaryText: "#FFFFFF",
    green: "#0EA371",
    yellow: "#D9920B",
    red: "#E11D48",
    greenSoft: "rgba(14,163,113,0.12)",
    yellowSoft: "rgba(217,146,11,0.14)",
    redSoft: "rgba(225,29,72,0.10)",
    overlay: "rgba(0,0,0,0.35)",
  },
};

export function themeForMode(mode: ThemeMode): Theme {
  return mode === "dark" ? darkTheme : lightTheme;
}

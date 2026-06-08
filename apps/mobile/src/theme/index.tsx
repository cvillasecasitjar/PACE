import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useSettings } from "../store/settings";
import { themeForMode, type Theme } from "./theme";

const ThemeContext = createContext<Theme>(themeForMode("dark"));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSettings((s) => s.themePreference);
  const system = useColorScheme();

  const theme = useMemo(() => {
    const mode =
      preference === "system" ? (system === "light" ? "light" : "dark") : preference;
    return themeForMode(mode);
  }, [preference, system]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export type { Theme, ThemeColors } from "./theme";

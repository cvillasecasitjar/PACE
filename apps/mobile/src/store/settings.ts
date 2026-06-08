import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { plainStorage } from "../lib/storage";
import type { Locale } from "@pace/shared";

export type ThemePreference = "system" | "light" | "dark";

interface SettingsState {
  themePreference: ThemePreference;
  locale: Locale;
  hydrated: boolean;
  setThemePreference: (p: ThemePreference) => void;
  setLocale: (l: Locale) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: "system",
      locale: "es",
      hydrated: false,
      setThemePreference: (themePreference) => set({ themePreference }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "pace-settings",
      storage: createJSONStorage(() => plainStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);

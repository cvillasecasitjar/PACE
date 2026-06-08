import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "./src/theme";
import { RootNavigator } from "./src/navigation";
import { Loader } from "./src/components/ui";
import { useAuth } from "./src/store/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function navThemeFrom(useDark: boolean, colors: ReturnType<typeof useTheme>["colors"]): NavTheme {
  const base = useDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg,
      card: colors.bgElevated,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };
}

function Inner() {
  const theme = useTheme();
  const initializing = useAuth((s) => s.initializing);
  const restore = useAuth((s) => s.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    <NavigationContainer theme={navThemeFrom(theme.mode === "dark", theme.colors)}>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      {initializing ? <Loader /> : <RootNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Inner />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

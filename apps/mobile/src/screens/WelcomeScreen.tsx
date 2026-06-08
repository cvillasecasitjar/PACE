import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Button } from "../components/ui";
import type { AuthStackParamList } from "../navigation/types";

export function WelcomeScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, padding: t.spacing(6), justifyContent: "space-between" }}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          {/* Brand mark */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: t.colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: t.spacing(8),
            }}
          >
            <Text style={{ fontSize: 34, fontWeight: "900", color: "#fff" }}>P</Text>
          </View>

          <Text
            style={{
              color: t.colors.text,
              fontSize: 34,
              fontWeight: "900",
              lineHeight: 40,
            }}
          >
            {tr("onboarding.welcome.title")}
          </Text>
          <Text
            style={{
              color: t.colors.textMuted,
              fontSize: 16,
              lineHeight: 24,
              marginTop: t.spacing(4),
            }}
          >
            {tr("onboarding.welcome.subtitle")}
          </Text>
        </View>

        <View style={{ gap: t.spacing(3) }}>
          <Button
            label={tr("onboarding.welcome.cta")}
            onPress={() => nav.navigate("Register")}
          />
          <Button
            label={tr("onboarding.welcome.login")}
            variant="ghost"
            onPress={() => nav.navigate("Login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

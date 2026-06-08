import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Button, Heading, Muted } from "../components/ui";
import { Input } from "../components/Input";
import { AuthApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../store/auth";
import type { AuthStackParamList } from "../navigation/types";

export function LoginScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const signIn = useAuth((s) => s.signIn);

  const [email, setEmail] = useState("demo@pace.app");
  const [password, setPassword] = useState("pace1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await AuthApi.login({ email: email.trim(), password });
      await signIn(res.token, res.user);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: t.spacing(6), flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Heading>{tr("auth.login.title")}</Heading>
          <Muted style={{ marginTop: t.spacing(2), marginBottom: t.spacing(6) }}>
            demo@pace.app · pace1234
          </Muted>

          <Input
            label={tr("auth.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <Input
            label={tr("auth.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? (
            <Text style={{ color: t.colors.red, marginBottom: t.spacing(3) }}>
              {error}
            </Text>
          ) : null}

          <Button
            label={tr("auth.login.cta")}
            onPress={submit}
            loading={loading}
            disabled={!email || !password}
            style={{ marginTop: t.spacing(2) }}
          />

          <Pressable
            onPress={() => nav.navigate("Register")}
            style={{ marginTop: t.spacing(5), alignItems: "center" }}
          >
            <Text style={{ color: t.colors.primary, fontWeight: "600" }}>
              {tr("auth.toRegister")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

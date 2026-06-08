import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Button, ErrorBanner, Heading, Muted } from "../components/ui";
import { Input } from "../components/Input";
import { AuthApi } from "../api/endpoints";
import { useErrorText } from "../api/errors";
import { useAuth } from "../store/auth";
import { useSettings } from "../store/settings";
import type { AuthStackParamList } from "../navigation/types";

export function RegisterScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const signIn = useAuth((s) => s.signIn);
  const locale = useSettings((s) => s.locale);
  const errorText = useErrorText();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await AuthApi.register({
        email: email.trim(),
        password,
        displayName: name.trim() || undefined,
        locale,
      });
      await signIn(res.token, res.user);
    } catch (e) {
      setError(errorText(e));
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
          <Heading>{tr("auth.register.title")}</Heading>
          <Muted style={{ marginTop: t.spacing(2), marginBottom: t.spacing(6) }}>
            {tr("auth.register.subtitle")}
          </Muted>

          <Input
            label={tr("auth.name")}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
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
            <ErrorBanner message={error} style={{ marginBottom: t.spacing(3) }} />
          ) : null}

          <Button
            label={tr("auth.register.cta")}
            onPress={submit}
            loading={loading}
            disabled={!email || password.length < 8}
            style={{ marginTop: t.spacing(2) }}
          />

          <Pressable
            onPress={() => nav.navigate("Login")}
            style={{ marginTop: t.spacing(5), alignItems: "center" }}
          >
            <Text style={{ color: t.colors.primary, fontWeight: "600" }}>
              {tr("auth.toLogin")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

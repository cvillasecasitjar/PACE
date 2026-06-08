import React, { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Button, Card, ErrorBanner, Heading, Muted } from "../components/ui";
import { BankApi } from "../api/endpoints";
import { useErrorText } from "../api/errors";
import { qk } from "../api/hooks";
import type { OnboardingStackParamList } from "../navigation/types";

export function ConnectBankScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const nav = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const qc = useQueryClient();
  const errorText = useErrorText();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setError(null);
    setLoading(true);
    try {
      await BankApi.connect("Demo Bank");
      await qc.invalidateQueries({ queryKey: qk.connections });
      nav.navigate("Buffer");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, padding: t.spacing(6), justifyContent: "space-between" }}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 56, marginBottom: t.spacing(4) }}>🏦</Text>
          <Heading>{tr("bank.title")}</Heading>
          <Muted style={{ marginTop: t.spacing(3), lineHeight: 22 }}>
            {tr("bank.subtitle")}
          </Muted>

          <Card style={{ marginTop: t.spacing(6) }} alt>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 20, marginRight: t.spacing(3) }}>🔒</Text>
              <Text style={{ color: t.colors.textMuted, fontSize: 13, flex: 1 }}>
                {tr("bank.secure")}
              </Text>
            </View>
          </Card>

          {error ? (
            <ErrorBanner message={error} style={{ marginTop: t.spacing(4) }} />
          ) : null}
        </View>

        <Button
          label={loading ? tr("bank.connecting") : tr("bank.connect")}
          onPress={connect}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
}

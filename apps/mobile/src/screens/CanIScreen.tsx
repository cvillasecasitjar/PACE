import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { DecisionResult } from "@pace/shared";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Button } from "../components/ui";
import { useDecision } from "../api/hooks";
import { currencySymbol } from "../lib/format";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function CanIScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const decision = useDecision();
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<DecisionResult | null>(null);

  function press(key: string) {
    setResult(null);
    setAmount((prev) => {
      if (key === "⌫") return prev.slice(0, -1);
      if (key === ".") return prev.includes(".") ? prev : prev === "" ? "0." : prev + ".";
      // limit to 2 decimals
      if (prev.includes(".") && prev.split(".")[1]?.length >= 2) return prev;
      if (prev.replace(".", "").length >= 7) return prev;
      return prev + key;
    });
  }

  async function ask() {
    const value = parseFloat(amount || "0");
    if (!value) return;
    const res = await decision.mutateAsync(value);
    setResult(res);
  }

  const verdictColor = result
    ? result.verdict === "yes"
      ? t.colors.green
      : result.verdict === "caution"
      ? t.colors.yellow
      : t.colors.red
    : t.colors.text;
  const verdictEmoji = result
    ? result.verdict === "yes"
      ? "✅"
      : result.verdict === "caution"
      ? "⚠️"
      : "🛑"
    : "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={["top"]}>
      <View style={{ flex: 1, padding: t.spacing(5) }}>
        <Text style={{ color: t.colors.text, fontSize: 24, fontWeight: "800" }}>
          {tr("canI.title")}
        </Text>
        <Text style={{ color: t.colors.textMuted, marginTop: t.spacing(1) }}>
          {tr("canI.subtitle")}
        </Text>

        {/* Amount display */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text
            style={{
              color: amount ? t.colors.text : t.colors.textFaint,
              fontSize: 64,
              fontWeight: "900",
            }}
          >
            {currencySymbol(result?.currency ?? "EUR")}
            {amount || "0"}
          </Text>

          {result ? (
            <View style={{ alignItems: "center", marginTop: t.spacing(4) }}>
              <Text style={{ fontSize: 40 }}>{verdictEmoji}</Text>
              <Text
                style={{
                  color: verdictColor,
                  fontSize: 24,
                  fontWeight: "800",
                  marginTop: t.spacing(2),
                }}
              >
                {tr(`decision.${result.verdict}`)}
              </Text>
              <Text
                style={{
                  color: t.colors.textMuted,
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: t.spacing(2),
                  lineHeight: 20,
                  paddingHorizontal: t.spacing(4),
                }}
              >
                {tr(`${result.i18n.key}.msg`, result.i18n.params)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Keypad */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginBottom: t.spacing(3),
          }}
        >
          {KEYS.map((k) => (
            <Pressable
              key={k}
              onPress={() => press(k)}
              style={({ pressed }) => ({
                width: "33.33%",
                paddingVertical: t.spacing(4),
                alignItems: "center",
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Text style={{ color: t.colors.text, fontSize: 26, fontWeight: "600" }}>
                {k}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          label={tr("canI.ask")}
          onPress={ask}
          loading={decision.isPending}
          disabled={!amount || parseFloat(amount) === 0}
        />
      </View>
    </SafeAreaView>
  );
}

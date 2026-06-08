import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCategory } from "@pace/shared";
import type { SpendQueryResult } from "@pace/shared";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { useAsk } from "../api/hooks";
import { currencySymbol, dayHeading, formatMoney } from "../lib/format";

type ChatMsg =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; result: SpendQueryResult };

let counter = 0;
const nextId = () => `m${counter++}`;

export function CanIScreen() {
  const t = useTheme();
  const { t: tr, locale } = useT();
  const ask = useAsk();
  const scrollRef = useRef<ScrollView>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  function scrollToEnd() {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: trimmed }]);
    scrollToEnd();
    try {
      const result = await ask.mutateAsync(trimmed);
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", result }]);
      scrollToEnd();
    } catch {
      // Surface nothing fancy here; the input stays usable for a retry.
    }
  }

  const examples = [tr("canI.example1"), tr("canI.example2"), tr("canI.example3")];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={{ paddingHorizontal: t.spacing(5), paddingTop: t.spacing(2) }}>
          <Text style={{ color: t.colors.text, fontSize: 24, fontWeight: "800" }}>
            {tr("canI.title")}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: t.spacing(5), paddingBottom: t.spacing(4) }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Greeting + example chips */}
          <AssistantBubble t={t}>
            <Text style={{ color: t.colors.text, fontSize: 15, lineHeight: 21 }}>
              {tr("canI.greeting")}
            </Text>
            <View style={{ marginTop: t.spacing(3), gap: t.spacing(2) }}>
              {examples.map((ex) => (
                <Pressable
                  key={ex}
                  onPress={() => send(ex)}
                  style={({ pressed }) => ({
                    alignSelf: "flex-start",
                    backgroundColor: pressed ? t.colors.primary + "22" : t.colors.cardAlt,
                    borderColor: t.colors.border,
                    borderWidth: 1,
                    borderRadius: t.radius.pill,
                    paddingVertical: t.spacing(1.5),
                    paddingHorizontal: t.spacing(3),
                  })}
                >
                  <Text style={{ color: t.colors.primary, fontSize: 13, fontWeight: "600" }}>
                    {ex}
                  </Text>
                </Pressable>
              ))}
            </View>
          </AssistantBubble>

          {messages.map((m) =>
            m.role === "user" ? (
              <UserBubble key={m.id} t={t} text={m.text} />
            ) : (
              <AssistantBubble key={m.id} t={t}>
                <AnswerCard result={m.result} t={t} tr={tr} locale={locale} />
              </AssistantBubble>
            )
          )}

          {ask.isPending ? (
            <AssistantBubble t={t}>
              <Text style={{ color: t.colors.textMuted, fontSize: 15 }}>…</Text>
            </AssistantBubble>
          ) : null}
        </ScrollView>

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: t.spacing(2),
            paddingHorizontal: t.spacing(4),
            paddingTop: t.spacing(2),
            paddingBottom: t.spacing(3),
            borderTopWidth: 1,
            borderTopColor: t.colors.border,
            backgroundColor: t.colors.bg,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={tr("canI.placeholder")}
            placeholderTextColor={t.colors.textFaint}
            multiline
            onSubmitEditing={() => send(input)}
            blurOnSubmit
            returnKeyType="send"
            style={{
              flex: 1,
              color: t.colors.text,
              backgroundColor: t.colors.cardAlt,
              borderRadius: t.radius.lg,
              borderWidth: 1,
              borderColor: t.colors.border,
              paddingHorizontal: t.spacing(3.5),
              paddingTop: t.spacing(2.5),
              paddingBottom: t.spacing(2.5),
              fontSize: 15,
              maxHeight: 110,
            }}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || ask.isPending}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: input.trim() ? t.colors.primary : t.colors.border,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

type Theme = ReturnType<typeof useTheme>;

function UserBubble({ t, text }: { t: Theme; text: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-end",
        maxWidth: "85%",
        backgroundColor: t.colors.primary,
        borderRadius: t.radius.xl,
        borderBottomRightRadius: t.radius.sm,
        paddingVertical: t.spacing(2.5),
        paddingHorizontal: t.spacing(3.5),
        marginBottom: t.spacing(3),
      }}
    >
      <Text style={{ color: "#fff", fontSize: 15, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}

function AssistantBubble({ t, children }: { t: Theme; children: React.ReactNode }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        maxWidth: "92%",
        backgroundColor: t.colors.card,
        borderRadius: t.radius.xl,
        borderBottomLeftRadius: t.radius.sm,
        borderWidth: 1,
        borderColor: t.colors.border,
        paddingVertical: t.spacing(3),
        paddingHorizontal: t.spacing(3.5),
        marginBottom: t.spacing(3),
      }}
    >
      {children}
    </View>
  );
}

function AnswerCard({
  result,
  t,
  tr,
  locale,
}: {
  result: SpendQueryResult;
  t: Theme;
  tr: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
}) {
  const { decision, parsed } = result;
  const cat = getCategory(result.category);
  const catLabel = locale === "es" ? cat.label_es : cat.label_en;
  const cur = decision?.currency ?? "EUR";

  if (!decision) {
    return (
      <Text style={{ color: t.colors.text, fontSize: 15, lineHeight: 21 }}>
        {tr("canI.noAmount")}
      </Text>
    );
  }

  const color =
    decision.verdict === "yes"
      ? t.colors.green
      : decision.verdict === "caution"
      ? t.colors.yellow
      : t.colors.red;
  const emoji =
    decision.verdict === "yes" ? "✅" : decision.verdict === "caution" ? "⚠️" : "🛑";

  return (
    <View>
      {/* Verdict line */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        <Text style={{ color, fontSize: 18, fontWeight: "800" }}>
          {tr(`decision.${decision.verdict}`)} · {formatMoney(decision.amount, cur)}
        </Text>
      </View>

      {/* Decision message */}
      <Text
        style={{
          color: t.colors.textMuted,
          fontSize: 14,
          lineHeight: 20,
          marginTop: t.spacing(2),
        }}
      >
        {tr(`${decision.i18n.key}.msg`, decision.i18n.params)}
      </Text>

      {/* Context chips */}
      <View style={{ marginTop: t.spacing(3), gap: t.spacing(1.5) }}>
        <Chip
          t={t}
          icon="📂"
          label={`${catLabel}${parsed.date ? ` · ${dayHeading(parsed.date, locale)}` : ""}`}
        />
        <Chip
          t={t}
          icon={cat.icon}
          label={tr("canI.spentThisMonth", {
            category: catLabel,
            spent: formatMoney(result.spentThisMonth, cur),
          })}
        />
        {result.budgetLimit != null ? (
          <Chip
            t={t}
            icon="🎯"
            label={tr("canI.budgetLine", {
              category: catLabel,
              spent: formatMoney(result.spentThisMonth, cur),
              limit: formatMoney(result.budgetLimit, cur),
              remaining: formatMoney(result.budgetRemaining ?? 0, cur),
            })}
          />
        ) : null}
        <Chip
          t={t}
          icon="💸"
          label={tr("canI.remainingAfter", {
            amount: formatMoney(decision.remainingAfter, cur),
          })}
        />
      </View>
    </View>
  );
}

function Chip({ t, icon, label }: { t: Theme; icon: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={{ color: t.colors.text, fontSize: 13, flex: 1 }}>{label}</Text>
    </View>
  );
}

import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CATEGORIES, getCategory, type CategoryId } from "@pace/shared";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Card, Loader, Muted, ProgressBar } from "../components/ui";
import { CategoryPickerModal } from "../components/CategoryPickerModal";
import {
  useBudgetSuggestions,
  useBudgets,
  useRemoveBudget,
  useUpsertBudget,
} from "../api/hooks";
import { formatMoney, formatMoneyShort } from "../lib/format";

export function BudgetsScreen() {
  const t = useTheme();
  const { t: tr, locale } = useT();
  const { data: budgets, isLoading } = useBudgets();
  const { data: suggestions } = useBudgetSuggestions();
  const upsert = useUpsertBudget();
  const remove = useRemoveBudget();
  const [picking, setPicking] = useState(false);

  if (isLoading || !budgets) return <Loader />;

  const existing = new Set(budgets.map((b) => b.category));
  const newSuggestions = (suggestions ?? []).filter((s) => !existing.has(s.category));
  const currency = "EUR";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: t.spacing(5), paddingBottom: t.spacing(10) }}>
        <Text style={{ color: t.colors.text, fontSize: 24, fontWeight: "800" }}>
          {tr("budgets.title")}
        </Text>
        <Muted style={{ marginTop: t.spacing(1), marginBottom: t.spacing(4) }}>
          {tr("budgets.subtitle")}
        </Muted>

        {budgets.length === 0 ? (
          <Muted style={{ marginVertical: t.spacing(4) }}>{tr("budgets.empty")}</Muted>
        ) : (
          budgets
            .slice()
            .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
            .map((b) => {
              const meta = getCategory(b.category);
              const ratio = b.limit > 0 ? b.spent / b.limit : 0;
              const color =
                ratio > 0.9 ? t.colors.red : ratio >= 0.6 ? t.colors.yellow : t.colors.green;
              const remaining = b.limit - b.spent;
              return (
                <Card key={b.id} style={{ marginBottom: t.spacing(3) }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 20, marginRight: t.spacing(2) }}>{meta.icon}</Text>
                    <Text style={{ color: t.colors.text, fontWeight: "700", fontSize: 16, flex: 1 }}>
                      {locale === "es" ? meta.label_es : meta.label_en}
                    </Text>
                    <Pressable onPress={() => remove.mutate(b.category)} hitSlop={10}>
                      <Text style={{ color: t.colors.textFaint, fontSize: 18 }}>✕</Text>
                    </Pressable>
                  </View>

                  <View style={{ marginTop: t.spacing(3) }}>
                    <ProgressBar ratio={ratio} color={color} />
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: t.spacing(3),
                    }}
                  >
                    <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>
                      {tr("budgets.spentOf", {
                        spent: formatMoney(b.spent, currency),
                        limit: formatMoney(b.limit, currency),
                      })}
                    </Text>
                    <Text
                      style={{
                        color: remaining < 0 ? t.colors.red : t.colors.textMuted,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {remaining < 0
                        ? tr("budgets.over", { amount: formatMoneyShort(-remaining, currency) })
                        : tr("budgets.remaining", { amount: formatMoneyShort(remaining, currency) })}
                    </Text>
                  </View>

                  {/* Adjust limit */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      marginTop: t.spacing(3),
                      gap: t.spacing(3),
                    }}
                  >
                    <Adjust label="−" onPress={() => upsert.mutate({ category: b.category, limit: Math.max(0, b.limit - 10) })} />
                    <Text style={{ color: t.colors.text, fontWeight: "700", minWidth: 60, textAlign: "center" }}>
                      {formatMoneyShort(b.limit, currency)}
                    </Text>
                    <Adjust label="+" onPress={() => upsert.mutate({ category: b.category, limit: b.limit + 10 })} />
                  </View>
                </Card>
              );
            })
        )}

        {/* Suggested budgets */}
        {newSuggestions.length > 0 ? (
          <View style={{ marginTop: t.spacing(4) }}>
            <Muted style={{ marginBottom: t.spacing(2) }}>{tr("budgets.suggested")}</Muted>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
              {newSuggestions.slice(0, 6).map((s) => {
                const meta = CATEGORIES[s.category];
                return (
                  <Pressable
                    key={s.category}
                    onPress={() => upsert.mutate({ category: s.category, limit: s.suggested })}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: t.spacing(2),
                      paddingHorizontal: t.spacing(3),
                      borderRadius: t.radius.pill,
                      backgroundColor: t.colors.cardAlt,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                    }}
                  >
                    <Text style={{ marginRight: 6 }}>{meta.icon}</Text>
                    <Text style={{ color: t.colors.text, fontWeight: "600" }}>
                      {(locale === "es" ? meta.label_es : meta.label_en)} · {formatMoneyShort(s.suggested)}
                    </Text>
                    <Text style={{ color: t.colors.primary, marginLeft: 6, fontWeight: "800" }}>+</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() => setPicking(true)}
          style={{
            marginTop: t.spacing(5),
            paddingVertical: t.spacing(3.5),
            borderRadius: t.radius.pill,
            borderWidth: 1,
            borderColor: t.colors.primary,
            alignItems: "center",
          }}
        >
          <Text style={{ color: t.colors.primary, fontWeight: "700" }}>
            + {tr("budgets.add")}
          </Text>
        </Pressable>
      </ScrollView>

      <CategoryPickerModal
        visible={picking}
        onClose={() => setPicking(false)}
        onSelect={(cat: CategoryId) => {
          const suggested = (suggestions ?? []).find((s) => s.category === cat)?.suggested ?? 50;
          upsert.mutate({ category: cat, limit: suggested });
        }}
      />
    </SafeAreaView>
  );
}

function Adjust({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: t.colors.cardAlt,
        borderWidth: 1,
        borderColor: t.colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: t.colors.text, fontSize: 20, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

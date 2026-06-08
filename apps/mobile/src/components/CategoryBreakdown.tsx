import React from "react";
import { Text, View } from "react-native";
import { getCategory } from "@pace/shared";
import type { CategorySpend } from "@pace/shared";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { formatMoney } from "../lib/format";

/** Monthly spend grouped by category, with budget progress where set. */
export function CategoryBreakdown({
  data,
  currency,
  max = 6,
}: {
  data: CategorySpend[];
  currency: string;
  max?: number;
}) {
  const t = useTheme();
  const { t: tr, locale } = useT();

  if (data.length === 0) {
    return <Text style={{ color: t.colors.textMuted, fontSize: 14 }}>{tr("dashboard.noSpend")}</Text>;
  }

  const rows = data.slice(0, max);

  return (
    <View style={{ gap: t.spacing(3.5) }}>
      {rows.map((row) => {
        const cat = getCategory(row.category);
        const label = locale === "es" ? cat.label_es : cat.label_en;

        const hasBudget = row.budgetLimit != null && row.budgetLimit > 0;
        const pct = hasBudget ? row.spent / (row.budgetLimit as number) : row.share;
        const fill = Math.max(0.02, Math.min(1, pct));
        const over = hasBudget && row.spent > (row.budgetLimit as number);

        const barColor = hasBudget
          ? over
            ? t.colors.red
            : pct >= 0.8
            ? t.colors.yellow
            : t.colors.green
          : cat.color;

        return (
          <View key={row.category}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: t.spacing(1.5),
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
                <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                <Text style={{ color: t.colors.text, fontSize: 14, fontWeight: "600" }}>
                  {label}
                </Text>
              </View>
              <Text style={{ color: t.colors.text, fontSize: 14, fontWeight: "700" }}>
                {formatMoney(row.spent, currency)}
              </Text>
            </View>

            {/* Progress / share bar */}
            <View
              style={{
                height: 7,
                borderRadius: 4,
                backgroundColor: t.colors.cardAlt,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${fill * 100}%`,
                  height: "100%",
                  borderRadius: 4,
                  backgroundColor: barColor,
                }}
              />
            </View>

            {/* Caption: budget progress, or share of total */}
            <Text style={{ color: over ? t.colors.red : t.colors.textFaint, fontSize: 11, marginTop: t.spacing(1) }}>
              {hasBudget
                ? over
                  ? tr("dashboard.overBudget", {
                      amount: formatMoney(row.spent - (row.budgetLimit as number), currency),
                    })
                  : `${formatMoney(row.spent, currency)} / ${formatMoney(row.budgetLimit as number, currency)}`
                : tr("dashboard.ofSpend", { pct: Math.round(row.share * 100) })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

import React from "react";
import { Pressable, Text, View } from "react-native";
import type { Transaction } from "@pace/shared";
import { getCategory } from "@pace/shared";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { formatMoney } from "../lib/format";
import { CategoryIcon } from "./CategoryIcon";

export function TransactionRow({
  tx,
  onPress,
}: {
  tx: Transaction;
  onPress?: () => void;
}) {
  const t = useTheme();
  const { locale, t: tr } = useT();
  const meta = getCategory(tx.category);
  const isIncome = tx.amount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: t.spacing(2.5),
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <CategoryIcon category={tx.category} />
      <View style={{ flex: 1, marginLeft: t.spacing(3) }}>
        <Text
          numberOfLines={1}
          style={{ color: t.colors.text, fontWeight: "600", fontSize: 15 }}
        >
          {tx.merchant || tx.description}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
          <Text style={{ color: t.colors.textMuted, fontSize: 12 }}>
            {locale === "es" ? meta.label_es : meta.label_en}
          </Text>
          {tx.isRecurring ? (
            <Text style={{ color: t.colors.textFaint, fontSize: 12 }}>
              {"  ·  " + tr("tx.recurring")}
            </Text>
          ) : null}
        </View>
      </View>
      <Text
        style={{
          color: isIncome ? t.colors.green : t.colors.text,
          fontWeight: "700",
          fontSize: 15,
        }}
      >
        {isIncome ? "+" : ""}
        {formatMoney(tx.amount, tx.currency)}
      </Text>
    </Pressable>
  );
}

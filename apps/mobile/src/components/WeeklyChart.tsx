import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "../theme";
import { formatMoneyShort } from "../lib/format";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export function WeeklyChart({
  data,
  currency,
}: {
  data: { date: string; amount: number }[];
  currency: string;
}) {
  const t = useTheme();
  const max = Math.max(1, ...data.map((d) => d.amount));

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: 90,
          gap: t.spacing(2),
        }}
      >
        {data.map((d, i) => {
          const ratio = d.amount / max;
          const isMax = d.amount === max && d.amount > 0;
          return (
            <View key={d.date} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: "70%",
                  height: Math.max(4, ratio * 70),
                  backgroundColor: isMax ? t.colors.primary : t.colors.cardAlt,
                  borderRadius: 6,
                }}
              />
              <Text
                style={{
                  color: t.colors.textFaint,
                  fontSize: 11,
                  marginTop: t.spacing(1.5),
                }}
              >
                {weekdayLabel(d.date, i, data.length)}
              </Text>
            </View>
          );
        })}
      </View>
      <Text
        style={{
          color: t.colors.textFaint,
          fontSize: 11,
          marginTop: t.spacing(2),
          textAlign: "right",
        }}
      >
        max {formatMoneyShort(max, currency)}
      </Text>
    </View>
  );
}

function weekdayLabel(iso: string, _i: number, _len: number): string {
  const day = new Date(iso).getDay(); // 0 Sun .. 6 Sat
  const idx = day === 0 ? 6 : day - 1; // map to Mon-first
  return WEEKDAY_LABELS[idx];
}

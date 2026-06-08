import React, { useMemo, useState } from "react";
import { SectionList, Text, TextInput, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CATEGORIES, type CategoryId, type Transaction } from "@pace/shared";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Loader, Pill } from "../components/ui";
import { TransactionRow } from "../components/TransactionRow";
import { CategoryPickerModal } from "../components/CategoryPickerModal";
import { useSetCategory, useTransactions } from "../api/hooks";
import { dayHeading } from "../lib/format";

export function TransactionsScreen() {
  const t = useTheme();
  const { t: tr, locale } = useT();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryId | undefined>();
  const [editing, setEditing] = useState<Transaction | null>(null);

  const { data, isLoading } = useTransactions({ search: search || undefined, category });
  const setCat = useSetCategory();

  const sections = useMemo(() => groupByDay(data ?? [], locale), [data, locale]);

  // Categories present in the data, for the filter chips.
  const chips: (CategoryId | undefined)[] = [undefined, ...Object.keys(CATEGORIES).filter((c) =>
    (data ?? []).some((tx) => tx.category === c)
  ) as CategoryId[]];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={["top"]}>
      <View style={{ padding: t.spacing(5), paddingBottom: t.spacing(2) }}>
        <Text style={{ color: t.colors.text, fontSize: 24, fontWeight: "800" }}>
          {tr("tx.title")}
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={tr("tx.search")}
          placeholderTextColor={t.colors.textFaint}
          style={{
            backgroundColor: t.colors.cardAlt,
            borderRadius: t.radius.md,
            paddingHorizontal: t.spacing(4),
            paddingVertical: t.spacing(3),
            color: t.colors.text,
            marginTop: t.spacing(3),
            borderWidth: 1,
            borderColor: t.colors.border,
          }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: t.spacing(3) }}
        >
          {chips.map((c) => (
            <Pill
              key={c ?? "all"}
              label={c ? (locale === "es" ? CATEGORIES[c].label_es : CATEGORIES[c].label_en) : tr("tx.all")}
              active={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <Loader />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: t.spacing(5), paddingBottom: t.spacing(10) }}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <Text style={{ color: t.colors.textMuted, textAlign: "center", marginTop: t.spacing(10) }}>
              {tr("tx.empty")}
            </Text>
          }
          renderSectionHeader={({ section }) => (
            <Text
              style={{
                color: t.colors.textFaint,
                fontSize: 13,
                fontWeight: "700",
                marginTop: t.spacing(4),
                marginBottom: t.spacing(1),
                textTransform: "capitalize",
              }}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <TransactionRow tx={item} onPress={() => setEditing(item)} />
          )}
        />
      )}

      <CategoryPickerModal
        visible={!!editing}
        selected={editing?.category}
        onClose={() => setEditing(null)}
        onSelect={(cat) => {
          if (editing) setCat.mutate({ id: editing.id, category: cat });
        }}
      />
    </SafeAreaView>
  );
}

function groupByDay(txns: Transaction[], locale: string) {
  const map = new Map<string, Transaction[]>();
  for (const tx of txns) {
    const key = tx.date.slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(tx);
    map.set(key, arr);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => ({
      title: dayHeading(items[0].date, locale),
      data: items,
      key,
    }));
}

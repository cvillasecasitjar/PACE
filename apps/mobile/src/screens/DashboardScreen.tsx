import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Button, Card, Loader, Muted } from "../components/ui";
import { WeeklyChart } from "../components/WeeklyChart";
import { TransactionRow } from "../components/TransactionRow";
import { useDashboard, useSync } from "../api/hooks";
import { useAuth } from "../store/auth";
import { formatMoney, formatMoneyShort } from "../lib/format";
import type { MainTabsParamList } from "../navigation/types";

export function DashboardScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const nav = useNavigation<BottomTabNavigationProp<MainTabsParamList>>();
  const user = useAuth((s) => s.user);
  const { data, isLoading, refetch, isRefetching } = useDashboard();
  const sync = useSync();

  if (isLoading || !data) return <Loader label={tr("common.loading")} />;

  const statusColor =
    data.status === "green"
      ? t.colors.green
      : data.status === "yellow"
      ? t.colors.yellow
      : t.colors.red;
  const statusSoft =
    data.status === "green"
      ? t.colors.greenSoft
      : data.status === "yellow"
      ? t.colors.yellowSoft
      : t.colors.redSoft;

  async function onRefresh() {
    await sync.mutateAsync();
    await refetch();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: t.spacing(5), paddingBottom: t.spacing(10) }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || sync.isPending}
            onRefresh={onRefresh}
            tintColor={t.colors.primary}
          />
        }
      >
        <Text style={{ color: t.colors.textMuted, fontSize: 15 }}>
          {tr("dashboard.greeting", { name: user?.displayName ?? "" })}
        </Text>

        {/* Headline available card */}
        <Card
          style={{
            marginTop: t.spacing(4),
            backgroundColor: statusSoft,
            borderColor: statusColor + "55",
          }}
        >
          <Muted>{tr("dashboard.available")}</Muted>
          <Text
            style={{
              color: statusColor,
              fontSize: 44,
              fontWeight: "900",
              marginTop: t.spacing(1),
            }}
          >
            {formatMoneyShort(data.discretionaryAvailable, data.currency)}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: t.spacing(3),
            }}
          >
            <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>
              {tr("dashboard.balance")}: {formatMoney(data.currentBalance, data.currency)}
            </Text>
            <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>
              {tr("dashboard.commitments")}: {formatMoneyShort(data.upcomingCommitments, data.currency)}
            </Text>
          </View>
        </Card>

        <Button
          label={tr("dashboard.canIspend")}
          onPress={() => nav.navigate("CanI")}
          style={{ marginTop: t.spacing(4) }}
        />

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: t.spacing(3), marginTop: t.spacing(4) }}>
          <StatCard
            label={tr("dashboard.spent7")}
            value={formatMoneyShort(data.spentLast7Days, data.currency)}
          />
          <StatCard
            label={tr("dashboard.spentMonth")}
            value={formatMoneyShort(data.spentThisMonth, data.currency)}
          />
        </View>

        {/* Weekly chart */}
        <Card style={{ marginTop: t.spacing(4) }}>
          <Muted style={{ marginBottom: t.spacing(3) }}>{tr("dashboard.thisWeek")}</Muted>
          <WeeklyChart data={data.weeklySpend} currency={data.currency} />
        </Card>

        {/* Recent transactions */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: t.spacing(6),
            marginBottom: t.spacing(1),
          }}
        >
          <Text style={{ color: t.colors.text, fontSize: 18, fontWeight: "800" }}>
            {tr("dashboard.recent")}
          </Text>
          <Text
            onPress={() => nav.navigate("Transactions")}
            style={{ color: t.colors.primary, fontWeight: "600" }}
          >
            {tr("dashboard.viewAll")}
          </Text>
        </View>
        <Card>
          {data.recentTransactions.map((tx, i) => (
            <View key={tx.id}>
              {i > 0 ? (
                <View style={{ height: 1, backgroundColor: t.colors.border }} />
              ) : null}
              <TransactionRow tx={tx} />
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ color: t.colors.textMuted, fontSize: 12 }}>{label}</Text>
      <Text
        style={{
          color: t.colors.text,
          fontSize: 22,
          fontWeight: "800",
          marginTop: t.spacing(1),
        }}
      >
        {value}
      </Text>
    </Card>
  );
}

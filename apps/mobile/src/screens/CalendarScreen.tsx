import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPlanType } from "@pace/shared";
import type { PlannedEvent } from "@pace/shared";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Button, Card, ErrorState, Loader, Muted } from "../components/ui";
import { AddPlanModal } from "../components/AddPlanModal";
import { MonthCalendar } from "../components/MonthCalendar";
import { useDashboard, usePlans } from "../api/hooks";
import { formatMoney, formatMoneyShort, dayHeading } from "../lib/format";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Every ISO day a plan touches, from its start through its (optional) end. */
function planDays(p: PlannedEvent): string[] {
  const start = p.date.slice(0, 10);
  const end = (p.endDate ?? p.date).slice(0, 10);
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last) {
    days.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
        cursor.getDate()
      ).padStart(2, "0")}`
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function CalendarScreen() {
  const t = useTheme();
  const { t: tr, locale } = useT();
  // Fetch all plans (not just upcoming) so done/past plans still show on the
  // calendar with their real cost.
  const { data: plans, isLoading, isError, refetch } = usePlans(false);
  const { data: dashboard } = useDashboard();
  const currency = dashboard?.currency ?? "EUR";

  const [selectedDay, setSelectedDay] = useState(todayIso());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlannedEvent | null>(null);

  // Days that have at least one plan (ranges expanded), for the calendar dots.
  const markedDates = useMemo(() => {
    const set = new Set<string>();
    for (const p of plans ?? []) for (const d of planDays(p)) set.add(d);
    return set;
  }, [plans]);

  // Plans active on the selected day.
  const dayPlans = useMemo(
    () => (plans ?? []).filter((p) => planDays(p).includes(selectedDay)),
    [plans, selectedDay]
  );

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(plan: PlannedEvent) {
    setEditing(plan);
    setModalOpen(true);
  }

  if (isLoading) return <Loader label={tr("common.loading")} />;
  if (isError || !plans) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <ErrorState
          title={tr("errors.loadTitle")}
          message={tr("errors.network")}
          onRetry={() => void refetch()}
          retryLabel={tr("common.retry")}
        />
      </SafeAreaView>
    );
  }

  const plannedThisMonth = dashboard?.plannedThisMonth ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: t.spacing(5), paddingBottom: t.spacing(12) }}
      >
        <Text style={{ color: t.colors.text, fontSize: 24, fontWeight: "800" }}>
          {tr("calendar.title")}
        </Text>
        <Muted style={{ marginTop: t.spacing(1) }}>{tr("calendar.subtitle")}</Muted>

        {/* Planned-this-month total */}
        <Card style={{ marginTop: t.spacing(4) }} alt>
          <Muted>{tr("calendar.plannedThisMonth")}</Muted>
          <Text
            style={{
              color: t.colors.text,
              fontSize: 34,
              fontWeight: "900",
              marginTop: t.spacing(1),
            }}
          >
            {formatMoneyShort(plannedThisMonth, currency)}
          </Text>
        </Card>

        <Button label={tr("calendar.add")} onPress={openNew} style={{ marginTop: t.spacing(4) }} />

        {/* Calendar with plan markers */}
        <Card style={{ marginTop: t.spacing(4) }}>
          <MonthCalendar
            value={{ start: selectedDay, end: null }}
            onChange={(r) => setSelectedDay(r.start)}
            mode="single"
            markedDates={markedDates}
            locale={locale}
          />
        </Card>

        {/* Selected day's plans + amounts */}
        <Text
          style={{
            color: t.colors.text,
            fontSize: 16,
            fontWeight: "800",
            marginTop: t.spacing(6),
            marginBottom: t.spacing(2),
            textTransform: "capitalize",
          }}
        >
          {dayHeading(selectedDay, locale)}
        </Text>

        {dayPlans.length === 0 ? (
          <Muted style={{ marginTop: t.spacing(1) }}>{tr("calendar.emptyDay")}</Muted>
        ) : (
          <Card style={{ padding: t.spacing(2) }}>
            {dayPlans.map((p, i) => {
              const meta = getPlanType(p.type);
              const done = p.status === "done";
              const shownAmount = done ? p.actualAmount ?? p.estimatedAmount : p.estimatedAmount;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => openEdit(p)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    padding: t.spacing(2.5),
                    borderRadius: t.radius.md,
                    backgroundColor: pressed ? t.colors.cardAlt : "transparent",
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: t.colors.border,
                    opacity: done ? 0.75 : 1,
                  })}
                >
                  <Text style={{ fontSize: 24, marginRight: t.spacing(3) }}>
                    {done ? "✅" : meta.icon}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: t.colors.text, fontSize: 16, fontWeight: "600" }}
                      numberOfLines={1}
                    >
                      {p.title}
                    </Text>
                    <Text style={{ color: t.colors.textMuted, fontSize: 12 }}>
                      {done
                        ? tr("plan.doneBadge")
                        : locale === "es"
                        ? meta.label_es
                        : meta.label_en}
                      {p.endDate ? ` · ${tr("calendar.multiDay")}` : ""}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: done ? t.colors.green : t.colors.text,
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    {formatMoney(shownAmount, currency)}
                  </Text>
                </Pressable>
              );
            })}
          </Card>
        )}
      </ScrollView>

      <AddPlanModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        currency={currency}
        plan={editing}
        initialDate={selectedDay}
      />
    </SafeAreaView>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { PLAN_TYPE_IDS, getPlanType } from "@pace/shared";
import type { PlannedEvent, PlanType } from "@pace/shared";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Button } from "./ui";
import { Input } from "./Input";
import { MonthCalendar, type DateRange } from "./MonthCalendar";
import { useCreatePlan, useUpdatePlan, useDeletePlan, usePlanSuggestion } from "../api/hooks";
import { currencySymbol } from "../lib/format";

/** ISO "YYYY-MM-DD" for `offset` days from today (local time). */
function isoDay(offset: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function AddPlanModal({
  visible,
  onClose,
  currency = "EUR",
  plan,
  initialDate,
}: {
  visible: boolean;
  onClose: () => void;
  currency?: string;
  /** When provided, the modal edits this plan instead of creating one. */
  plan?: PlannedEvent | null;
  /** Pre-selected start day when creating a new plan (ISO "YYYY-MM-DD"). */
  initialDate?: string;
}) {
  const t = useTheme();
  const { t: tr, locale } = useT();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const isEditing = !!plan;

  const [type, setType] = useState<PlanType>("dinner");
  const [title, setTitle] = useState("");
  const [range, setRange] = useState<DateRange>({ start: isoDay(0), end: null });
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [actual, setActual] = useState("");

  // Reset the form whenever the modal opens (fresh create, or load a plan to edit).
  useEffect(() => {
    if (!visible) return;
    if (plan) {
      setType(plan.type);
      setTitle(plan.title);
      setRange({ start: plan.date.slice(0, 10), end: plan.endDate?.slice(0, 10) ?? null });
      setAmount(String(plan.estimatedAmount));
      setAmountTouched(true);
      setActual(String(plan.actualAmount ?? plan.estimatedAmount));
    } else {
      setType("dinner");
      setTitle("");
      setRange({ start: initialDate ?? isoDay(0), end: null });
      setAmount("");
      setAmountTouched(false);
    }
  }, [visible, plan, initialDate]);

  // Learned suggestion for the chosen type; prefill the amount until the user
  // edits it themselves.
  const suggestion = usePlanSuggestion(type);
  useEffect(() => {
    if (!amountTouched && suggestion.data) {
      setAmount(String(suggestion.data.suggested));
    }
  }, [suggestion.data, amountTouched]);

  function fmtDay(iso: string, withMonth: boolean): string {
    if (iso === isoDay(0)) return tr("common.today");
    if (iso === isoDay(1)) return tr("common.tomorrow");
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
      weekday: "short",
      day: "numeric",
      ...(withMonth ? { month: "short" } : {}),
    });
  }

  const rangeLabel = useMemo(() => {
    if (!range.end) return fmtDay(range.start, true);
    return `${fmtDay(range.start, false)} → ${fmtDay(range.end, true)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, locale]);

  const parsedAmount = parseFloat(amount.replace(",", ".")) || 0;
  const canSave = parsedAmount > 0 && !createPlan.isPending && !updatePlan.isPending;

  async function save() {
    if (parsedAmount <= 0) return;
    if (isEditing && plan) {
      await updatePlan.mutateAsync({
        id: plan.id,
        patch: {
          title: title.trim() || undefined,
          type,
          date: range.start,
          endDate: range.end,
          estimatedAmount: parsedAmount,
        },
      });
    } else {
      await createPlan.mutateAsync({
        title: title.trim() || undefined,
        type,
        date: range.start,
        endDate: range.end,
        estimatedAmount: parsedAmount,
      });
    }
    onClose();
  }

  async function remove() {
    if (plan) {
      await deletePlan.mutateAsync(plan.id);
      onClose();
    }
  }

  const isDone = plan?.status === "done";
  const parsedActual = parseFloat(actual.replace(",", ".")) || 0;

  async function markDone() {
    if (!plan) return;
    await updatePlan.mutateAsync({
      id: plan.id,
      patch: { status: "done", actualAmount: parsedActual || plan.estimatedAmount },
    });
    onClose();
  }

  async function reopen() {
    if (!plan) return;
    await updatePlan.mutateAsync({
      id: plan.id,
      patch: { status: "planned", actualAmount: null },
    });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: t.colors.bg,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            paddingHorizontal: t.spacing(5),
            paddingTop: t.spacing(4),
            paddingBottom: t.spacing(8),
            maxHeight: "90%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: t.spacing(4),
            }}
          >
            <Text style={{ color: t.colors.text, fontSize: 20, fontWeight: "800" }}>
              {tr(isEditing ? "plan.edit" : "plan.new")}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: t.colors.textMuted, fontSize: 22 }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Plan type */}
            <Text style={labelStyle(t)}>{tr("plan.type")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: t.spacing(4) }}
            >
              {PLAN_TYPE_IDS.map((id) => {
                const meta = getPlanType(id);
                const active = id === type;
                return (
                  <Pressable
                    key={id}
                    onPress={() => {
                      setType(id);
                      setAmountTouched(false);
                    }}
                    style={{
                      alignItems: "center",
                      paddingVertical: t.spacing(2),
                      paddingHorizontal: t.spacing(3),
                      marginRight: t.spacing(2),
                      borderRadius: t.radius.lg,
                      borderWidth: 1,
                      borderColor: active ? t.colors.primary : t.colors.border,
                      backgroundColor: active ? t.colors.primary + "22" : t.colors.cardAlt,
                      minWidth: 76,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{meta.icon}</Text>
                    <Text
                      style={{
                        color: active ? t.colors.primary : t.colors.textMuted,
                        fontSize: 11,
                        fontWeight: "600",
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      {locale === "es" ? meta.label_es : meta.label_en}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* When */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: t.spacing(2),
              }}
            >
              <Text style={labelStyle(t)}>{tr("plan.when")}</Text>
              <Text
                style={{
                  color: t.colors.primary,
                  fontSize: 13,
                  fontWeight: "700",
                  textTransform: "capitalize",
                }}
              >
                {rangeLabel}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: t.colors.cardAlt,
                borderRadius: t.radius.lg,
                borderWidth: 1,
                borderColor: t.colors.border,
                padding: t.spacing(3),
                marginBottom: t.spacing(4),
              }}
            >
              <MonthCalendar
                value={range}
                onChange={setRange}
                locale={locale}
                minDate={isoDay(0)}
              />
            </View>

            {/* Amount */}
            <Input
              label={`${tr("plan.amount")} (${currencySymbol(currency)})`}
              value={amount}
              onChangeText={(v) => {
                setAmount(v);
                setAmountTouched(true);
              }}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            {suggestion.data ? (
              <Text
                style={{
                  color: t.colors.textFaint,
                  fontSize: 12,
                  marginTop: -t.spacing(1),
                  marginBottom: t.spacing(3),
                }}
              >
                {tr(`plan.estimate.${suggestion.data.basis}`)}
              </Text>
            ) : null}

            {/* Optional name */}
            <Input
              label={tr("plan.name")}
              value={title}
              onChangeText={setTitle}
              placeholder={tr("plan.namePlaceholder")}
            />

            <Button
              label={tr("plan.save")}
              onPress={save}
              loading={createPlan.isPending || updatePlan.isPending}
              disabled={!canSave}
              style={{ marginTop: t.spacing(2) }}
            />

            {isEditing && plan ? (
              <View
                style={{
                  marginTop: t.spacing(4),
                  paddingTop: t.spacing(4),
                  borderTopWidth: 1,
                  borderTopColor: t.colors.border,
                }}
              >
                {isDone ? (
                  <>
                    <Text
                      style={{
                        color: t.colors.green,
                        fontSize: 14,
                        fontWeight: "700",
                        marginBottom: t.spacing(1),
                      }}
                    >
                      {tr("plan.doneBadge")} · {currencySymbol(currency)}
                      {plan.actualAmount ?? plan.estimatedAmount}
                    </Text>
                    <Text
                      style={{
                        color: t.colors.textFaint,
                        fontSize: 12,
                        marginBottom: t.spacing(3),
                      }}
                    >
                      {tr("plan.doneHint")}
                    </Text>
                    <Button
                      label={tr("plan.reopen")}
                      onPress={reopen}
                      variant="secondary"
                      loading={updatePlan.isPending}
                    />
                  </>
                ) : (
                  <>
                    <Text style={labelStyle(t)}>{tr("plan.markDoneTitle")}</Text>
                    <Text
                      style={{
                        color: t.colors.textFaint,
                        fontSize: 12,
                        marginBottom: t.spacing(2),
                      }}
                    >
                      {tr("plan.markDoneHint")}
                    </Text>
                    <Input
                      label={`${tr("plan.actualAmount")} (${currencySymbol(currency)})`}
                      value={actual}
                      onChangeText={setActual}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                    <Button
                      label={tr("plan.markDoneBtn")}
                      onPress={markDone}
                      variant="secondary"
                      loading={updatePlan.isPending}
                    />
                  </>
                )}
              </View>
            ) : null}

            {isEditing ? (
              <Button
                label={tr("common.delete")}
                onPress={remove}
                variant="ghost"
                loading={deletePlan.isPending}
                style={{ marginTop: t.spacing(2) }}
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function labelStyle(t: ReturnType<typeof useTheme>) {
  return {
    color: t.colors.textMuted,
    fontSize: 13,
    fontWeight: "600" as const,
    marginBottom: t.spacing(1.5),
  };
}

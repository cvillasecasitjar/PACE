import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../theme";

export interface DateRange {
  /** ISO "YYYY-MM-DD" start day. */
  start: string;
  /** ISO "YYYY-MM-DD" end day, or null for a single-day selection. */
  end: string | null;
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayIso(): string {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Lightweight month calendar. Pure JS (no native modules), so it runs fine in
 * Expo Go. Supports:
 *  - single-day or range selection (`mode`),
 *  - dot markers on days that have something (`markedDates`),
 *  - month navigation, and optional disabling of days before `minDate`.
 *
 * The grid is drawn as explicit rows of 7 cells (each `flex: 1`) so every
 * weekday column — Sunday included — is always selectable.
 */
export function MonthCalendar({
  value,
  onChange,
  locale = "es",
  minDate,
  mode = "range",
  markedDates,
  markColor,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
  locale?: string;
  /** Days before this ISO date are disabled. Omit to allow any day. */
  minDate?: string;
  mode?: "single" | "range";
  /** ISO days to mark with a dot. */
  markedDates?: Set<string>;
  markColor?: string;
}) {
  const t = useTheme();
  const intlLocale = locale === "es" ? "es-ES" : "en-GB";
  const dot = markColor ?? t.colors.primary;

  const init = new Date(`${value.start || todayIso()}T00:00:00`);
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-first

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(intlLocale, { weekday: "narrow" })
  );

  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString(intlLocale, {
    month: "long",
    year: "numeric",
  });

  function selectDay(day: string) {
    if (mode === "single") {
      onChange({ start: day, end: null });
      return;
    }
    const { start, end } = value;
    if (!start || (start && end)) {
      onChange({ start: day, end: null });
    } else if (day >= start) {
      onChange({ start, end: day === start ? null : day });
    } else {
      onChange({ start: day, end: null });
    }
  }

  const inRange = (day: string) =>
    !!value.end && day > value.start && day < value.end;
  const isEdge = (day: string) => day === value.start || day === value.end;

  function shiftMonth(delta: number) {
    setView((v) => {
      const next = new Date(v.y, v.m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  }

  // Build cells (leading blanks + day numbers), then chunk into weeks of 7.
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      {/* Month navigation */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: t.spacing(2),
        }}
      >
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} style={{ padding: t.spacing(1) }}>
          <Text style={{ color: t.colors.primary, fontSize: 22, fontWeight: "700" }}>‹</Text>
        </Pressable>
        <Text
          style={{
            color: t.colors.text,
            fontSize: 15,
            fontWeight: "700",
            textTransform: "capitalize",
          }}
        >
          {monthLabel}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={10} style={{ padding: t.spacing(1) }}>
          <Text style={{ color: t.colors.primary, fontSize: 22, fontWeight: "700" }}>›</Text>
        </Pressable>
      </View>

      {/* Weekday headers */}
      <View style={{ flexDirection: "row" }}>
        {weekdays.map((w, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", paddingVertical: t.spacing(1) }}>
            <Text
              style={{
                color: t.colors.textFaint,
                fontSize: 11,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              {w}
            </Text>
          </View>
        ))}
      </View>

      {/* Day grid — one row per week, 7 equal cells each */}
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: "row" }}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={`b${wi}-${di}`} style={{ flex: 1, height: 46 }} />;
            }
            const dayIso = iso(view.y, view.m, day);
            const disabled = !!minDate && dayIso < minDate;
            const edge = isEdge(dayIso);
            const within = inRange(dayIso);
            const marked = markedDates?.has(dayIso);
            return (
              <View
                key={dayIso}
                style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }}
              >
                <Pressable
                  onPress={() => !disabled && selectDay(dayIso)}
                  disabled={disabled}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: edge
                      ? t.colors.primary
                      : within
                      ? t.colors.primary + "22"
                      : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: disabled
                        ? t.colors.textFaint
                        : edge
                        ? t.colors.primaryText
                        : t.colors.text,
                      fontSize: 15,
                      fontWeight: edge ? "800" : "500",
                      opacity: disabled ? 0.35 : 1,
                    }}
                  >
                    {day}
                  </Text>
                </Pressable>
                {/* marker dot */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 4,
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: marked && !edge ? dot : "transparent",
                  }}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

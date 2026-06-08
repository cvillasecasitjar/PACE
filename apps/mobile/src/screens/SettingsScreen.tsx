import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Locale } from "@pace/shared";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Button, Card, Muted } from "../components/ui";
import { useConnections, useSync, useUpdateUser } from "../api/hooks";
import { BankApi } from "../api/endpoints";
import { useAuth } from "../store/auth";
import { useSettings, type ThemePreference } from "../store/settings";
import { formatMoney, formatMoneyShort } from "../lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "../api/hooks";

export function SettingsScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { themePreference, setThemePreference, locale, setLocale } = useSettings();
  const { data: connections } = useConnections();
  const sync = useSync();
  const updateUser = useUpdateUser();
  const qc = useQueryClient();

  const themeOptions: { id: ThemePreference; label: string }[] = [
    { id: "system", label: tr("settings.system") },
    { id: "light", label: tr("settings.light") },
    { id: "dark", label: tr("settings.dark") },
  ];

  async function disconnect(id: string) {
    await BankApi.disconnect(id);
    await qc.invalidateQueries({ queryKey: qk.connections });
    await qc.invalidateQueries({ queryKey: qk.dashboard });
  }

  function changeBuffer(delta: number) {
    const next = Math.max(0, (user?.safetyBuffer ?? 0) + delta);
    updateUser.mutate({ safetyBuffer: next });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: t.spacing(5), paddingBottom: t.spacing(10) }}>
        <Text style={{ color: t.colors.text, fontSize: 24, fontWeight: "800", marginBottom: t.spacing(4) }}>
          {tr("settings.title")}
        </Text>

        {/* Appearance */}
        <Section title={tr("settings.appearance")}>
          <Segmented
            options={themeOptions.map((o) => ({ id: o.id, label: o.label }))}
            value={themePreference}
            onChange={(id) => setThemePreference(id as ThemePreference)}
          />
        </Section>

        {/* Language */}
        <Section title={tr("settings.language")}>
          <Segmented
            options={[
              { id: "es", label: "Español" },
              { id: "en", label: "English" },
            ]}
            value={locale}
            onChange={(id) => {
              setLocale(id as Locale);
              updateUser.mutate({ locale: id as Locale });
            }}
          />
        </Section>

        {/* Safety buffer */}
        <Section title={tr("settings.buffer")}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: t.colors.text, fontSize: 22, fontWeight: "800" }}>
              {formatMoneyShort(user?.safetyBuffer ?? 0)}
            </Text>
            <View style={{ flexDirection: "row", gap: t.spacing(3) }}>
              <Round label="−" onPress={() => changeBuffer(-10)} />
              <Round label="+" onPress={() => changeBuffer(10)} />
            </View>
          </View>
        </Section>

        {/* Connected accounts */}
        <Section title={tr("settings.accounts")}>
          {(connections ?? []).filter((c) => c.isActive).map((c) => (
            <View
              key={c.id}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: t.spacing(2) }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.colors.text, fontWeight: "600" }}>
                  {c.institutionName} {c.mask}
                </Text>
                <Muted>{formatMoney(c.balance, c.currency)}</Muted>
              </View>
              <Pressable onPress={() => disconnect(c.id)} hitSlop={8}>
                <Text style={{ color: t.colors.red, fontWeight: "600" }}>
                  {tr("settings.disconnect")}
                </Text>
              </Pressable>
            </View>
          ))}
          <Button
            label={tr("settings.sync")}
            variant="secondary"
            onPress={() => sync.mutate()}
            loading={sync.isPending}
            style={{ marginTop: t.spacing(3) }}
          />
        </Section>

        <Button
          label={tr("settings.logout")}
          variant="ghost"
          onPress={signOut}
          style={{ marginTop: t.spacing(4) }}
        />
        <Text style={{ color: t.colors.textFaint, textAlign: "center", marginTop: t.spacing(4) }}>
          {user?.email}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: t.spacing(4) }}>
      <Muted style={{ marginBottom: t.spacing(2), marginLeft: t.spacing(1) }}>{title}</Muted>
      <Card>{children}</Card>
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: t.spacing(2) }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={{
              flex: 1,
              paddingVertical: t.spacing(2.5),
              borderRadius: t.radius.md,
              backgroundColor: active ? t.colors.primary : t.colors.cardAlt,
              alignItems: "center",
              borderWidth: 1,
              borderColor: active ? t.colors.primary : t.colors.border,
            }}
          >
            <Text style={{ color: active ? t.colors.primaryText : t.colors.textMuted, fontWeight: "600" }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Round({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: t.colors.cardAlt,
        borderWidth: 1,
        borderColor: t.colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: t.colors.text, fontSize: 22, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

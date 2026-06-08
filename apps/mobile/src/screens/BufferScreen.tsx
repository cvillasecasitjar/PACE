import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { Button, Heading, Muted } from "../components/ui";
import { useUpdateUser } from "../api/hooks";
import { useAuth } from "../store/auth";
import { formatMoneyShort } from "../lib/format";
import { useOnboarding } from "../navigation/OnboardingContext";

const PRESETS = [0, 50, 100, 150, 200, 300];

export function BufferScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const user = useAuth((s) => s.user);
  const { complete } = useOnboarding();
  const updateUser = useUpdateUser();
  const [value, setValue] = useState<number>(user?.safetyBuffer ?? 100);

  async function finish() {
    try {
      await updateUser.mutateAsync({ safetyBuffer: value });
    } finally {
      complete();
    }
  }

  function step(delta: number) {
    setValue((v) => Math.max(0, v + delta));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, padding: t.spacing(6), justifyContent: "space-between" }}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 56, marginBottom: t.spacing(4) }}>🛟</Text>
          <Heading>{tr("buffer.title")}</Heading>
          <Muted style={{ marginTop: t.spacing(3), lineHeight: 22 }}>
            {tr("buffer.subtitle")}
          </Muted>

          {/* Big value with steppers */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginVertical: t.spacing(8),
            }}
          >
            <Stepper label="−" onPress={() => step(-10)} />
            <Text
              style={{
                color: t.colors.text,
                fontSize: 52,
                fontWeight: "900",
                marginHorizontal: t.spacing(6),
                minWidth: 140,
                textAlign: "center",
              }}
            >
              {formatMoneyShort(value)}
            </Text>
            <Stepper label="+" onPress={() => step(10)} />
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2), justifyContent: "center" }}>
            {PRESETS.map((p) => {
              const active = p === value;
              return (
                <Pressable
                  key={p}
                  onPress={() => setValue(p)}
                  style={{
                    paddingVertical: t.spacing(2),
                    paddingHorizontal: t.spacing(4),
                    borderRadius: t.radius.pill,
                    backgroundColor: active ? t.colors.primary : t.colors.cardAlt,
                    borderWidth: 1,
                    borderColor: active ? t.colors.primary : t.colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: active ? t.colors.primaryText : t.colors.textMuted,
                      fontWeight: "700",
                    }}
                  >
                    {formatMoneyShort(p)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          label={tr("buffer.finish")}
          onPress={finish}
          loading={updateUser.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: t.colors.cardAlt,
        borderWidth: 1,
        borderColor: t.colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: t.colors.text, fontSize: 28, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

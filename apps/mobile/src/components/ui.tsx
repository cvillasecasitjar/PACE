import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../theme";

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  children,
  style,
  alt,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  alt?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: alt ? t.colors.cardAlt : t.colors.card,
          borderRadius: t.radius.lg,
          padding: t.spacing(4),
          borderWidth: 1,
          borderColor: t.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* --------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const isPrimary = variant === "primary";
  const isGhost = variant === "ghost";
  const bg = isPrimary
    ? t.colors.primary
    : isGhost
    ? "transparent"
    : t.colors.cardAlt;
  const color = isPrimary ? t.colors.primaryText : t.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          paddingVertical: t.spacing(3.5),
          paddingHorizontal: t.spacing(5),
          borderRadius: t.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: isGhost ? 0 : 1,
          borderColor: isPrimary ? t.colors.primary : t.colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={{ color, fontSize: 16, fontWeight: "700" }}>{label}</Text>
      )}
    </Pressable>
  );
}

/* ---------------------------------- Pill ---------------------------------- */

export function Pill({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: t.spacing(2),
        paddingHorizontal: t.spacing(3.5),
        borderRadius: t.radius.pill,
        backgroundColor: active ? t.colors.primary : t.colors.cardAlt,
        borderWidth: 1,
        borderColor: active ? t.colors.primary : t.colors.border,
        marginRight: t.spacing(2),
      }}
    >
      <Text
        style={{
          color: active ? t.colors.primaryText : color ?? t.colors.textMuted,
          fontWeight: "600",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ------------------------------ Progress bar ------------------------------ */

export function ProgressBar({
  ratio,
  color,
  height = 10,
}: {
  ratio: number;
  color: string;
  height?: number;
}) {
  const t = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <View
      style={{
        height,
        backgroundColor: t.colors.cardAlt,
        borderRadius: t.radius.pill,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: t.radius.pill,
        }}
      />
    </View>
  );
}

/* -------------------------------- Typography ------------------------------- */

export function Heading({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text
      style={[
        { color: t.colors.text, fontSize: 26, fontWeight: "800" },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Muted({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text style={[{ color: t.colors.textMuted, fontSize: 14 }, style]}>
      {children}
    </Text>
  );
}

/* --------------------------------- States --------------------------------- */

export function Loader({ label }: { label?: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: t.spacing(6),
      }}
    >
      <ActivityIndicator color={t.colors.primary} size="large" />
      {label ? (
        <Text style={{ color: t.colors.textMuted, marginTop: t.spacing(3) }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

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
          shadowColor: "#000",
          shadowOpacity: t.mode === "dark" ? 0.35 : 0.06,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 2,
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
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
          borderWidth: isGhost ? 0 : 1,
          borderColor: isPrimary ? t.colors.primary : t.colors.border,
          // Lift only the primary button so it reads as the main action.
          shadowColor: isPrimary ? t.colors.primary : "transparent",
          shadowOpacity: isPrimary ? 0.35 : 0,
          shadowRadius: isPrimary ? 14 : 0,
          shadowOffset: { width: 0, height: 6 },
          elevation: isPrimary ? 4 : 0,
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

/** Inline error message for forms (e.g. failed login). */
export function ErrorBanner({
  message,
  style,
}: {
  message: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: t.spacing(2),
          backgroundColor: t.colors.redSoft,
          borderColor: t.colors.red + "55",
          borderWidth: 1,
          borderRadius: t.radius.md,
          paddingVertical: t.spacing(3),
          paddingHorizontal: t.spacing(3.5),
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 16 }}>⚠️</Text>
      <Text
        style={{
          color: t.colors.red,
          flex: 1,
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        {message}
      </Text>
    </View>
  );
}

/** Full-screen error state with an optional retry action. */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
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
      <Text style={{ fontSize: 44, marginBottom: t.spacing(3) }}>📡</Text>
      <Text
        style={{
          color: t.colors.text,
          fontSize: 18,
          fontWeight: "800",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {message ? (
        <Muted style={{ textAlign: "center", marginTop: t.spacing(2) }}>
          {message}
        </Muted>
      ) : null}
      {onRetry && retryLabel ? (
        <Button
          label={retryLabel}
          onPress={onRetry}
          variant="secondary"
          style={{ marginTop: t.spacing(5), alignSelf: "stretch" }}
        />
      ) : null}
    </View>
  );
}

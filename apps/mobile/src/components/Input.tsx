import React from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "../theme";

export function Input({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: t.spacing(3) }}>
      {label ? (
        <Text
          style={{
            color: t.colors.textMuted,
            fontSize: 13,
            marginBottom: t.spacing(1.5),
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={t.colors.textFaint}
        style={{
          backgroundColor: t.colors.cardAlt,
          borderWidth: 1,
          borderColor: t.colors.border,
          borderRadius: t.radius.md,
          paddingHorizontal: t.spacing(4),
          paddingVertical: t.spacing(3.5),
          color: t.colors.text,
          fontSize: 16,
        }}
        {...props}
      />
    </View>
  );
}

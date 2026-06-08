import React from "react";
import { Text, View } from "react-native";
import { getCategory } from "@pace/shared";

export function CategoryIcon({
  category,
  size = 40,
}: {
  category: string;
  size?: number;
}) {
  const meta = getCategory(category);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: meta.color + "22",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.45 }}>{meta.icon}</Text>
    </View>
  );
}

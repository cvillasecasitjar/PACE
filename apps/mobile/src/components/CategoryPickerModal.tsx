import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from "@pace/shared";
import { useTheme } from "../theme";
import { useT } from "../i18n";

export function CategoryPickerModal({
  visible,
  onClose,
  onSelect,
  selected,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: CategoryId) => void;
  selected?: CategoryId;
}) {
  const t = useTheme();
  const { t: tr, locale } = useT();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.bgElevated,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            padding: t.spacing(5),
            maxHeight: "75%",
          }}
        >
          <Text
            style={{
              color: t.colors.text,
              fontSize: 18,
              fontWeight: "800",
              marginBottom: t.spacing(4),
            }}
          >
            {tr("tx.changeCategory")}
          </Text>
          <ScrollView>
            {CATEGORY_IDS.map((id) => {
              const meta = CATEGORIES[id];
              const active = id === selected;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    onSelect(id);
                    onClose();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: t.spacing(3),
                    paddingHorizontal: t.spacing(3),
                    borderRadius: t.radius.md,
                    backgroundColor: active ? t.colors.cardAlt : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: meta.color + "22",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: t.spacing(3),
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                  </View>
                  <Text style={{ color: t.colors.text, fontSize: 16, flex: 1 }}>
                    {locale === "es" ? meta.label_es : meta.label_en}
                  </Text>
                  {active ? (
                    <Text style={{ color: t.colors.primary, fontWeight: "800" }}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

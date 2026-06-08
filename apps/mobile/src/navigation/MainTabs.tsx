import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "../theme";
import { useT } from "../i18n";
import { DashboardScreen } from "../screens/DashboardScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { TransactionsScreen } from "../screens/TransactionsScreen";
import { BudgetsScreen } from "../screens/BudgetsScreen";
import { CanIScreen } from "../screens/CanIScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import type { MainTabsParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICONS: Record<keyof MainTabsParamList, string> = {
  Home: "🏠",
  Calendar: "📅",
  Transactions: "📃",
  CanI: "💸",
  Budgets: "📊",
  Settings: "⚙️",
};

export function MainTabs() {
  const t = useTheme();
  const { t: tr } = useT();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.textFaint,
        tabBarStyle: {
          backgroundColor: t.colors.bgElevated,
          borderTopColor: t.colors.border,
          paddingTop: 6,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", paddingBottom: 4 },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>
            {ICONS[route.name]}
          </Text>
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ tabBarLabel: tr("tab.home") }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ tabBarLabel: tr("tab.calendar") }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ tabBarLabel: tr("tab.transactions") }}
      />
      <Tab.Screen
        name="CanI"
        component={CanIScreen}
        options={{ tabBarLabel: tr("tab.canI") }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ tabBarLabel: tr("tab.budgets") }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: tr("tab.settings") }}
      />
    </Tab.Navigator>
  );
}

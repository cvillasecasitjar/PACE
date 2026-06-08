import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../store/auth";
import { useConnections } from "../api/hooks";
import { Loader } from "../components/ui";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ConnectBankScreen } from "../screens/ConnectBankScreen";
import { BufferScreen } from "../screens/BufferScreen";
import { MainTabs } from "./MainTabs";
import { OnboardingProvider } from "./OnboardingContext";
import type { AuthStackParamList, OnboardingStackParamList } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="ConnectBank" component={ConnectBankScreen} />
      <OnboardingStack.Screen name="Buffer" component={BufferScreen} />
    </OnboardingStack.Navigator>
  );
}

/**
 * Once authenticated, decide between the onboarding flow (connect bank +
 * configure buffer) and the main app. A returning user with an active
 * connection lands straight in the tabs.
 */
function AppNavigator() {
  const { data: connections, isLoading } = useConnections();
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (completed === null && connections) {
      setCompleted(connections.some((c) => c.isActive));
    }
  }, [completed, connections]);

  if (isLoading || completed === null) return <Loader />;

  if (!completed) {
    return (
      <OnboardingProvider complete={() => setCompleted(true)}>
        <OnboardingNavigator />
      </OnboardingProvider>
    );
  }
  return <MainTabs />;
}

export function RootNavigator() {
  const token = useAuth((s) => s.token);
  return token ? <AppNavigator /> : <AuthNavigator />;
}

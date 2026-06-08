import React, { createContext, useContext } from "react";

const OnboardingContext = createContext<{ complete: () => void }>({
  complete: () => undefined,
});

export function OnboardingProvider({
  complete,
  children,
}: {
  complete: () => void;
  children: React.ReactNode;
}) {
  return (
    <OnboardingContext.Provider value={{ complete }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}

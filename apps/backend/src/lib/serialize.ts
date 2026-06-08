import type { User as SharedUser, Locale } from "@pace/shared";

export function serializeUser(u: {
  id: string;
  email: string;
  displayName: string;
  safetyBuffer: number;
  locale: string;
  createdAt: Date;
}): SharedUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    safetyBuffer: u.safetyBuffer,
    locale: u.locale as Locale,
    createdAt: u.createdAt.toISOString(),
  };
}

import { create } from "zustand";
import type { User } from "@pace/shared";
import { secureStorage } from "../lib/storage";

const TOKEN_KEY = "pace-auth-token";
const USER_KEY = "pace-auth-user";

interface AuthState {
  token: string | null;
  user: User | null;
  initializing: boolean;
  /** Load persisted session on app start. */
  restore: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  initializing: true,

  restore: async () => {
    try {
      const [token, userRaw] = await Promise.all([
        secureStorage.getItem(TOKEN_KEY),
        secureStorage.getItem(USER_KEY),
      ]);
      set({
        token: token ?? null,
        user: userRaw ? (JSON.parse(userRaw) as User) : null,
        initializing: false,
      });
    } catch {
      set({ initializing: false });
    }
  },

  signIn: async (token, user) => {
    await Promise.all([
      secureStorage.setItem(TOKEN_KEY, token),
      secureStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user });
  },

  setUser: async (user) => {
    await secureStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  signOut: async () => {
    await Promise.all([
      secureStorage.removeItem(TOKEN_KEY),
      secureStorage.removeItem(USER_KEY),
    ]);
    set({ token: null, user: null });
  },
}));

/** Snapshot accessor for non-React modules (e.g. the axios interceptor). */
export function getAuthToken(): string | null {
  return useAuth.getState().token;
}

import { Platform } from "react-native";

/**
 * Resolve the backend base URL per platform:
 *  - Web / iOS simulator: localhost works directly.
 *  - Android emulator: localhost is the device itself; 10.0.2.2 reaches the host.
 *  - Physical device (Expo Go): set EXPO_PUBLIC_API_URL to your machine's LAN IP,
 *    e.g. EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  if (Platform.OS === "android") return "http://10.0.2.2:4000";
  return "http://localhost:4000";
}

export const API_BASE_URL = resolveBaseUrl();

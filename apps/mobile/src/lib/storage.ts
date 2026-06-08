import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Cross-platform key/value storage.
 *
 * - Sensitive values (the auth token) use the OS secure enclave via
 *   expo-secure-store on native. SecureStore isn't available on web, so we
 *   transparently fall back to AsyncStorage (localStorage) there.
 * - Non-sensitive values (settings) always use AsyncStorage.
 */

const isWeb = Platform.OS === "web";

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (isWeb) return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

export const plainStorage = AsyncStorage;

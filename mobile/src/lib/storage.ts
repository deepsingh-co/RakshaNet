import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'suraksha.refresh-token';
export const OFFLINE_DATA_KEY = 'suraksha.offline-data.v1';

/** Refresh tokens live in the OS keychain on device, never AsyncStorage. */
export async function readRefreshToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function writeRefreshToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(REFRESH_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // Storage failures must not break an in-flight emergency request.
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(REFRESH_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // Best effort — the in-memory token is cleared by the API client anyway.
  }
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the in-memory state usable even if persistence is unavailable.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Best effort.
  }
}

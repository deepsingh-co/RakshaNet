import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { DeviceInfo } from '../types';

export const APP_VERSION = '0.1.0';

/** UUID generated on the device — used for offline idempotency. */
export function createClientId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function deviceInfo(): DeviceInfo {
  return {
    platform: Platform.OS,
    model: Device.modelName ?? 'unknown',
    appVersion: APP_VERSION,
  };
}

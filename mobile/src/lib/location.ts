import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import type { LocationInput } from '../types';

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), milliseconds);
    }),
  ]);
}

/**
 * Location is best effort and must never block an SOS. Returns null when
 * permission is denied, services are off, or no fix arrives in time.
 * `quick` favours the cached fix so the alert leaves the device immediately.
 */
export async function captureLocation(
  options: { quick?: boolean; requestPermission?: boolean } = {},
): Promise<LocationInput | null> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) return null;

    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted' && options.requestPermission !== false) {
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (permission.status !== 'granted') return null;

    const lastKnown = await withTimeout(
      Location.getLastKnownPositionAsync({ maxAge: options.quick ? 300_000 : 120_000, requiredAccuracy: 500 }),
      options.quick ? 900 : 2_000,
    );

    let current: Location.LocationObject | null = null;
    if (!options.quick || !lastKnown) {
      current = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: options.quick ? Location.Accuracy.Lowest : Location.Accuracy.Balanced,
        }),
        options.quick ? 2_000 : 6_000,
      );
    }

    const position = lastKnown ?? current;
    if (!position) return null;

    let batteryLevel: number | null = null;
    try {
      const level = await Battery.getBatteryLevelAsync();
      if (level >= 0 && level <= 1) batteryLevel = Math.round(level * 100);
    } catch {
      batteryLevel = null;
    }

    const heading = position.coords.heading;
    const speed = position.coords.speed;
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracyMeters:
        typeof position.coords.accuracy === 'number'
          ? Math.max(0, Math.round(position.coords.accuracy))
          : null,
      speedMps: speed !== null && speed >= 0 ? speed : null,
      headingDeg: heading !== null && heading >= 0 ? heading : null,
      batteryLevel,
      source: position === current ? 'GPS' : 'CACHED',
      capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
      offlineCaptured: false,
    };
  } catch {
    return null;
  }
}

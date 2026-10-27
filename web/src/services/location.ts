/**
 * Location service — wraps the browser Geolocation API with a timeout,
 * freshness metadata, and a persistent last-known fix. Never throws:
 * a missing location must never block an SOS.
 */
import type { LocationFix } from '../domain/types';
import { getSetting, setSetting } from '../data/db';

const LAST_FIX_KEY = 'lastFix';

function toFix(pos: GeolocationPosition, source: LocationFix['source']): LocationFix {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracyM: pos.coords.accuracy ?? 0,
    capturedAt: pos.timestamp,
    source: pos.coords.accuracy != null && pos.coords.accuracy <= 100 ? 'GPS' : source,
  };
}

export async function getCachedFix(): Promise<LocationFix | null> {
  return (await getSetting<LocationFix>(LAST_FIX_KEY)) ?? null;
}

async function cacheFix(fix: LocationFix): Promise<void> {
  await setSetting(LAST_FIX_KEY, fix);
}

export async function permissionState(): Promise<PermissionState | 'unsupported'> {
  if (!('geolocation' in navigator)) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'prompt';
  }
}

/**
 * Request a fresh fix with a hard timeout. Falls back to the cached
 * last-known fix. Returns null when nothing is available.
 */
export async function requestFreshFix(timeoutMs = 10_000): Promise<LocationFix | null> {
  if (!('geolocation' in navigator)) return getCachedFix();
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      });
    });
    const fix = toFix(pos, 'GPS');
    await cacheFix(fix);
    return fix;
  } catch {
    return getCachedFix();
  }
}

/** Background-ish watcher for time-boxed live sharing; returns a stop function. */
export function watchFix(onFix: (fix: LocationFix) => void): () => void {
  if (!('geolocation' in navigator)) return () => {};
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const fix = toFix(pos, 'GPS');
      void cacheFix(fix);
      onFix(fix);
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 5_000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

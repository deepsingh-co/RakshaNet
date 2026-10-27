/**
 * Local alarm — siren via Web Audio + vibration + screen wake lock.
 * Works fully offline. Mirrors the Android "local alarm" feature.
 */

let ctx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gain: GainNode | null = null;
let beepTimer: ReturnType<typeof setInterval> | null = null;
let vibrateTimer: ReturnType<typeof setInterval> | null = null;
let wakeLock: WakeLockSentinel | null = null;
let active = false;

export function isAlarmActive(): boolean {
  return active;
}

export async function startAlarm(): Promise<void> {
  if (active) return;
  active = true;

  try {
    ctx = new AudioContext();
    oscillator = ctx.createOscillator();
    gain = ctx.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = 950;
    gain.gain.value = 0;
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    // alternating siren: 200ms on / 150ms off
    beepTimer = setInterval(() => {
      if (!ctx || !gain) return;
      const on = gain.gain.value > 0;
      gain.gain.setTargetAtTime(on ? 0 : 0.25, ctx.currentTime, 0.01);
    }, 200);
  } catch {
    // audio may be blocked — vibration still works
  }

  if ('vibrate' in navigator) {
    navigator.vibrate([400, 200, 400, 200]);
    vibrateTimer = setInterval(() => navigator.vibrate([400, 200, 400, 200]), 1_000);
  }

  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch {
    // permission denied or unsupported — non-critical
  }
}

export function stopAlarm(): void {
  active = false;
  if (beepTimer) clearInterval(beepTimer);
  if (vibrateTimer) clearInterval(vibrateTimer);
  beepTimer = vibrateTimer = null;
  try {
    oscillator?.stop();
    ctx?.close();
  } catch {
    // already closed
  }
  oscillator = gain = ctx = null;
  if ('vibrate' in navigator) navigator.vibrate(0);
  void wakeLock?.release().catch(() => {});
  wakeLock = null;
}

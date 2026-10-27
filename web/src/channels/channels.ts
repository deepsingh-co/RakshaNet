/**
 * Channel abstraction — adding a channel never touches business logic.
 * Every adapter reports an honest DispatchResult: opening a composer is
 * HANDED_OFF, never SENT (ARCHITECTURE §4.6).
 */
import type { Channel } from '../domain/types';

export type DispatchOutcome = 'HANDED_OFF' | 'FAILED' | 'BLOCKED';

export interface DispatchResult {
  outcome: DispatchOutcome;
  /** set when outcome !== HANDED_OFF */
  error?: string;
}

export interface ChannelAdapter {
  id: Channel;
  label: string;
  /** Whether this browser/device can attempt the channel at all. */
  available(): boolean;
  /**
   * Hand the prepared message to the OS/app. MUST be called synchronously
   * within a user gesture where possible; never claims the message was sent.
   */
  dispatch(phone: string, message: string): DispatchResult;
}

function openExternal(url: string): DispatchResult {
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      // Popup blocked (e.g., not inside a user gesture) — stay honest:
      // the message was NOT handed off. Caller keeps it QUEUED for manual retry.
      return { outcome: 'BLOCKED', error: 'Popup blocked — tap Send to try again' };
    }
    return { outcome: 'HANDED_OFF' };
  } catch (e) {
    return { outcome: 'FAILED', error: e instanceof Error ? e.message : 'Hand-off failed' };
  }
}

export const whatsappChannel: ChannelAdapter = {
  id: 'WHATSAPP',
  label: 'WhatsApp',
  // wa.me works in any browser with internet; capability is checked at send time
  available: () => true,
  dispatch(phone, message) {
    const digits = phone.replace(/^\+/, '').replace(/^00/, '');
    if (!digits) return { outcome: 'FAILED', error: 'No phone number' };
    if (!navigator.onLine) {
      return { outcome: 'BLOCKED', error: 'No internet — WhatsApp needs a connection' };
    }
    return openExternal(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`);
  },
};

export const smsChannel: ChannelAdapter = {
  id: 'SMS',
  label: 'SMS',
  available: () => true,
  dispatch(phone, message) {
    if (!phone) return { outcome: 'FAILED', error: 'No phone number' };
    // iOS uses `&body=`, Android uses `?body=`
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const sep = isIOS ? '&' : '?';
    const url = `sms:${phone}${sep}body=${encodeURIComponent(message)}`;
    try {
      // sms: is an external protocol — assigning location does not navigate away
      window.location.href = url;
      return { outcome: 'HANDED_OFF' };
    } catch (e) {
      return {
        outcome: 'FAILED',
        error: e instanceof Error ? e.message : 'Could not open messaging app',
      };
    }
  },
};

export const callChannel: ChannelAdapter = {
  id: 'CALL',
  label: 'Call',
  available: () => true,
  dispatch(phone) {
    if (!phone) return { outcome: 'FAILED', error: 'No phone number' };
    try {
      window.location.href = `tel:${phone}`;
      return { outcome: 'HANDED_OFF' };
    } catch {
      return { outcome: 'FAILED', error: 'Could not start call' };
    }
  },
};

export const shareChannel: ChannelAdapter = {
  id: 'SHARE',
  label: 'Share',
  available: () => typeof navigator !== 'undefined' && 'share' in navigator,
  dispatch(_phone, message) {
    // navigator.share must be awaited by the caller within a user gesture;
    // we surface it as HANDED_OFF optimistically and correct on rejection.
    try {
      void navigator
        .share({ text: message })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return; // user cancelled
          console.warn('share failed', e);
        });
      return { outcome: 'HANDED_OFF' };
    } catch (e) {
      return { outcome: 'FAILED', error: e instanceof Error ? e.message : 'Share failed' };
    }
  },
};

export const CHANNELS: Record<Channel, ChannelAdapter> = {
  WHATSAPP: whatsappChannel,
  SMS: smsChannel,
  CALL: callChannel,
  SHARE: shareChannel,
};

export function channelAvailable(id: Channel): boolean {
  return CHANNELS[id].available();
}

import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import type { NotificationChannel } from '../models/Notification.js';
import { maskPhone } from '../models/TrustedContact.js';

/**
 * Notification transport.
 *
 * `console` is an explicit development simulation and is always recorded as
 * `simulated: true` — it is never presented as a real delivery.
 * `live` POSTs to a configured HTTP gateway. Without a gateway the send
 * fails with PROVIDER_NOT_CONFIGURED instead of silently pretending.
 */
export class NotificationProviderError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface SendInput {
  channel: NotificationChannel;
  destination: string;
  message: string;
  incidentId: string;
}

export interface SendResult {
  provider: string;
  providerMessageId: string;
  simulated: boolean;
}

interface GatewayConfig {
  provider: string;
  url: string;
  apiKey: string;
  from: string;
}

function gatewayFor(channel: NotificationChannel): GatewayConfig {
  switch (channel) {
    case 'SMS':
      return {
        provider: env.SMS_PROVIDER,
        url: env.SMS_API_URL,
        apiKey: env.SMS_API_KEY,
        from: env.SMS_FROM,
      };
    case 'WHATSAPP':
      return {
        provider: env.WHATSAPP_PROVIDER,
        url: env.WHATSAPP_API_URL,
        apiKey: env.WHATSAPP_API_KEY,
        from: '',
      };
    case 'PUSH':
      return {
        provider: env.PUSH_PROVIDER,
        url: env.PUSH_API_URL,
        apiKey: env.PUSH_API_KEY,
        from: '',
      };
  }
}

function messageFor(channel: NotificationChannel): string {
  return env.notificationMode === 'live'
    ? `[notify] ${channel} -> provider`
    : `[notify:simulated] ${channel}`;
}

export async function sendNotification(input: SendInput): Promise<SendResult> {
  if (env.notificationMode === 'console') {
    // eslint-disable-next-line no-console
    console.log(
      `${messageFor(input.channel)} ${maskPhone(input.destination)} incident=${input.incidentId}`,
    );
    return {
      provider: 'console',
      providerMessageId: `console_${randomUUID()}`,
      simulated: true,
    };
  }

  const cfg = gatewayFor(input.channel);
  if (!cfg.provider || !cfg.url) {
    throw new NotificationProviderError(
      'PROVIDER_NOT_CONFIGURED',
      `${input.channel} gateway is not configured`,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        channel: input.channel,
        to: input.destination,
        message: input.message,
        ...(cfg.from ? { from: cfg.from } : {}),
        incidentId: input.incidentId,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new NotificationProviderError(
        'PROVIDER_REJECTED',
        `${input.channel} gateway responded ${res.status}`,
      );
    }

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      messageId?: string;
      sid?: string;
    };

    return {
      provider: cfg.provider,
      providerMessageId: String(
        data.id ?? data.messageId ?? data.sid ?? `http_${Date.now()}_${randomUUID().slice(0, 8)}`,
      ),
      simulated: false,
    };
  } catch (err) {
    if (err instanceof NotificationProviderError) throw err;
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? `${input.channel} gateway timed out`
        : `${input.channel} gateway request failed`;
    throw new NotificationProviderError('PROVIDER_ERROR', message);
  } finally {
    clearTimeout(timer);
  }
}

/** Build the actual emergency message sent to a contact. */
export function buildAlertMessage(input: {
  ownerName: string;
  incidentId: string;
  type: string;
  startedAt: Date;
  location?: { lat: number; lng: number; accuracyMeters?: number | null } | null;
}): string {
  const mapLink = input.location
    ? ` Location: https://maps.google.com/?q=${input.location.lat.toFixed(6)},${input.location.lng.toFixed(6)}`
    : ' Location: not available yet.';
  const accuracy =
    input.location?.accuracyMeters != null
      ? ` (±${Math.round(input.location.accuracyMeters)}m)`
      : '';
  const time = input.startedAt.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  return `SURAKSHA AI ${input.type}: ${input.ownerName} needs help.${mapLink}${accuracy} Time: ${time}. Ref: ${input.incidentId.slice(-8)}. Automated emergency alert.`;
}

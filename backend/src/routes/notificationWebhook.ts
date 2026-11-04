import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Notification } from '../models/Notification.js';
import { env } from '../config/env.js';
import { audit } from '../services/audit.js';
import { toNotification } from '../services/incidentView.js';
import { emitToAdmins, emitToIncident, emitToUser } from '../services/realtime.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/** `sha256=<hex>` HMAC of the exact raw request body. */
export function signWebhookPayload(
  raw: string | Buffer,
  secret: string = env.NOTIFICATION_WEBHOOK_SECRET,
): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

const webhookSchema = z.object({
  providerMessageId: z.string().trim().min(1).max(200),
  status: z.enum(['SENT', 'DELIVERED', 'FAILED']),
  error: z.string().trim().max(500).optional(),
});

/**
 * Provider delivery callback.
 *
 * This is the only place a notification becomes DELIVERED. The endpoint
 * requires an HMAC signature and refuses to guess when the secret is not
 * configured.
 */
export const notificationWebhookHandler = asyncHandler(async (req, res) => {
  const secret = env.NOTIFICATION_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({
      error: { code: 'WEBHOOK_NOT_CONFIGURED', message: 'Webhook secret is not configured' },
    });
    return;
  }

  const raw = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));

  const signature = req.get('x-suraksha-signature') ?? '';
  if (!signature || !safeEqual(signature, signWebhookPayload(raw, secret))) {
    res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } });
    return;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw.toString('utf8'));
  } catch {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } });
    return;
  }

  const payload = webhookSchema.parse(json);

  const update =
    payload.status === 'DELIVERED'
      ? {
          filter: { providerMessageId: payload.providerMessageId, status: 'SENT' },
          set: { status: 'DELIVERED' as const, deliveredAt: new Date() },
        }
      : payload.status === 'SENT'
        ? {
            filter: {
              providerMessageId: payload.providerMessageId,
              status: { $in: ['QUEUED', 'SENDING'] },
            },
            set: { status: 'SENT' as const, sentAt: new Date() },
          }
        : {
            filter: {
              providerMessageId: payload.providerMessageId,
              status: { $in: ['QUEUED', 'SENDING', 'SENT'] },
            },
            set: {
              status: 'FAILED' as const,
              failedAt: new Date(),
              lastError: payload.error ?? 'provider reported failure',
            },
          };

  const updated = await Notification.findOneAndUpdate(update.filter, { $set: update.set }, {
    new: true,
  });

  if (!updated) {
    const existing = await Notification.findOne({
      providerMessageId: payload.providerMessageId,
    });
    if (!existing) {
      res.status(404).json({
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'No notification matched that provider message',
        },
      });
      return;
    }
    // Providers retry webhooks. A retry of the same final state is a no-op
    // success; a contradictory state change is rejected.
    if (existing.status === payload.status) {
      res.json({
        ok: true,
        deduplicated: true,
        notification: toNotification(existing),
      });
      return;
    }
    res.status(409).json({
      error: {
        code: 'INVALID_STATE',
        message: `Notification is already ${existing.status}`,
      },
    });
    return;
  }

  const view = toNotification(updated);
  await audit(null, {
    action:
      payload.status === 'DELIVERED'
        ? 'NOTIFICATION_DELIVERED'
        : payload.status === 'SENT'
          ? 'NOTIFICATION_SENT'
          : 'NOTIFICATION_FAILED',
    actorRole: 'PROVIDER',
    resourceType: 'notification',
    resourceId: updated._id.toString(),
    detail: `${payload.status.toLowerCase()} via webhook`,
  });

  emitToUser(updated.userId.toString(), 'notification:delivered', view);
  emitToIncident(updated.incidentId.toString(), 'notification:delivered', view);
  emitToAdmins('notification:delivered', view);

  res.json({ ok: true, notification: view });
});

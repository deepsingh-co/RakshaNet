import { Router } from 'express';
import { z } from 'zod';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  Notification,
} from '../models/Notification.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { resolveDataScope, scopeFilter } from '../services/scope.js';
import { toNotification } from '../services/incidentView.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

const listSchema = z.object({
  status: z.enum(NOTIFICATION_STATUSES).optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  incidentId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  ownerId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

/**
 * Delivery monitoring feed. Admins see every notification; guardians see
 * their own + linked children's; users see their own. Destination numbers
 * are always masked — the dashboard never needs full PII.
 */
notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listSchema.parse(req.query);
    const scope = await resolveDataScope(req, q.ownerId);

    const base: Record<string, unknown> = scopeFilter(scope);
    if (q.channel) base.channel = q.channel;
    if (q.incidentId) base.incidentId = q.incidentId;
    if (q.from || q.to) {
      base.queuedAt = {
        ...(q.from ? { $gte: q.from } : {}),
        ...(q.to ? { $lte: q.to } : {}),
      };
    }

    const listFilter = { ...base, ...(q.status ? { status: q.status } : {}) };

    const [total, notifications, summaryRows] = await Promise.all([
      Notification.countDocuments(listFilter),
      Notification.find(listFilter)
        .sort({ queuedAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
      Notification.aggregate<{ _id: string; count: number; simulated: number }>([
        { $match: base },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            simulated: { $sum: { $cond: ['$simulated', 1, 0] } },
          },
        },
      ]),
    ]);

    const byStatus = Object.fromEntries(summaryRows.map((row) => [row._id, row.count]));
    const simulated = summaryRows.reduce((sum, row) => sum + row.simulated, 0);

    if (req.auth!.role === 'ADMIN') {
      await audit(req, {
        action: 'ADMIN_ACTION',
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        resourceType: 'notification_list',
        detail: `viewed delivery monitor (${total} matching)`,
      });
    }

    res.json({
      notifications: notifications.map(toNotification),
      summary: {
        total: summaryRows.reduce((sum, row) => sum + row.count, 0),
        queued:
          (byStatus.QUEUED ?? 0) + (byStatus.SENDING ?? 0) + (byStatus.PENDING_SYNC ?? 0),
        sent: byStatus.SENT ?? 0,
        delivered: byStatus.DELIVERED ?? 0,
        failed: byStatus.FAILED ?? 0,
        simulated,
      },
      pagination: {
        total,
        page: q.page,
        limit: q.limit,
        pages: Math.ceil(total / q.limit),
      },
    });
  }),
);

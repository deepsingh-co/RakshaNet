import { Router } from 'express';
import { z } from 'zod';
import {
  ACTIVE_INCIDENT_STATUSES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  Incident,
} from '../models/Incident.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { GuardianLink } from '../models/GuardianLink.js';
import { AuditLog } from '../models/AuditLog.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.js';
import { resolveDataScope, scopeFilter } from '../services/scope.js';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

const DAY_MS = 24 * 60 * 60 * 1000;

const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  ownerId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
});

const exportSchema = rangeSchema.extend({
  status: z.enum(INCIDENT_STATUSES).optional(),
  type: z.enum(INCIDENT_TYPES).optional(),
});

interface CountRow {
  _id: string;
  count: number;
}

function resolveRange(from?: Date, to?: Date): { from: Date; to: Date } {
  const end = to ?? new Date();
  const start = from ?? new Date(end.getTime() - 30 * DAY_MS);
  if (start.getTime() > end.getTime()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'from must be before to');
  }
  return { from: start, to: end };
}

function countMap(rows: CountRow[]): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/* ------------------------------------------------------------------ */
/* GET /api/v1/analytics/summary — role-scoped dashboard metrics       */
/* ------------------------------------------------------------------ */

analyticsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const q = rangeSchema.parse(req.query);
    const range = resolveRange(q.from, q.to);
    const scope = await resolveDataScope(req, q.ownerId);

    const scopeOnly = scopeFilter(scope);
    const rangeMatch = {
      ...scopeOnly,
      startedAt: { $gte: range.from, $lte: range.to },
    };

    const [
      totals,
      byStatus,
      byType,
      byDay,
      activeCount,
      resolvedInRange,
      incidentIds,
      totalUsers,
      activeUsers,
      guardians,
      suspendedUsers,
      verifiedLinks,
      auditEvents,
    ] = await Promise.all([
      Incident.aggregate<{
        _id: null;
        total: number;
        offline: number;
        escalated: number;
        avgAckSeconds: number | null;
        avgResolveSeconds: number | null;
      }>([
        { $match: rangeMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            offline: { $sum: { $cond: ['$offlineCreated', 1, 0] } },
            escalated: { $sum: { $cond: [{ $gt: ['$escalationLevel', 0] }, 1, 0] } },
            avgAckSeconds: {
              $avg: {
                $cond: [
                  { $ne: ['$acknowledgedAt', null] },
                  { $divide: [{ $subtract: ['$acknowledgedAt', '$startedAt'] }, 1000] },
                  null,
                ],
              },
            },
            avgResolveSeconds: {
              $avg: {
                $cond: [
                  { $ne: ['$resolvedAt', null] },
                  { $divide: [{ $subtract: ['$resolvedAt', '$startedAt'] }, 1000] },
                  null,
                ],
              },
            },
          },
        },
      ]),
      Incident.aggregate<CountRow>([
        { $match: rangeMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Incident.aggregate<CountRow>([
        { $match: rangeMatch },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Incident.aggregate<CountRow>([
        { $match: rangeMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Incident.countDocuments({
        ...scopeOnly,
        status: { $in: ACTIVE_INCIDENT_STATUSES },
      }),
      Incident.countDocuments({
        ...scopeOnly,
        resolvedAt: { $ne: null, $gte: range.from, $lte: range.to },
      }),
      Incident.find(rangeMatch).distinct('_id'),
      req.auth!.role === 'ADMIN' ? User.countDocuments({}) : Promise.resolve(0),
      req.auth!.role === 'ADMIN' ? User.countDocuments({ status: 'ACTIVE' }) : Promise.resolve(0),
      req.auth!.role === 'ADMIN' ? User.countDocuments({ role: 'GUARDIAN' }) : Promise.resolve(0),
      req.auth!.role === 'ADMIN'
        ? User.countDocuments({ status: 'SUSPENDED' })
        : Promise.resolve(0),
      req.auth!.role === 'ADMIN'
        ? GuardianLink.countDocuments({ status: 'VERIFIED' })
        : Promise.resolve(Math.max(0, scope.userIds.length - 1)),
      req.auth!.role === 'ADMIN'
        ? AuditLog.countDocuments({ createdAt: { $gte: range.from, $lte: range.to } })
        : Promise.resolve(0),
    ]);

    const notificationRows = await Notification.aggregate<{
      _id: string;
      count: number;
      simulated: number;
    }>([
      { $match: { incidentId: { $in: incidentIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          simulated: { $sum: { $cond: ['$simulated', 1, 0] } },
        },
      },
    ]);

    const notificationByStatus = Object.fromEntries(
      notificationRows.map((row) => [row._id, row.count]),
    );
    const simulated = notificationRows.reduce((sum, row) => sum + row.simulated, 0);
    const notificationTotal = notificationRows.reduce((sum, row) => sum + row.count, 0);
    const incidentTotal = totals[0]?.total ?? 0;

    res.json({
      range,
      generatedAt: new Date().toISOString(),
      viewerRole: req.auth!.role,
      incidents: {
        total: incidentTotal,
        active: activeCount,
        resolvedInRange,
        offline: totals[0]?.offline ?? 0,
        escalated: totals[0]?.escalated ?? 0,
        avgAckSeconds: totals[0]?.avgAckSeconds ?? null,
        avgResolveSeconds: totals[0]?.avgResolveSeconds ?? null,
        byStatus: countMap(byStatus),
        byType: countMap(byType),
        byDay: byDay.map((row) => ({ date: row._id, count: row.count })),
      },
      notifications: {
        total: notificationTotal,
        queued:
          (notificationByStatus.QUEUED ?? 0) +
          (notificationByStatus.SENDING ?? 0) +
          (notificationByStatus.PENDING_SYNC ?? 0),
        sent: notificationByStatus.SENT ?? 0,
        delivered: notificationByStatus.DELIVERED ?? 0,
        failed: notificationByStatus.FAILED ?? 0,
        simulated,
      },
      ...(req.auth!.role === 'ADMIN'
        ? {
            users: {
              total: totalUsers,
              active: activeUsers,
              guardians,
              suspended: suspendedUsers,
              verifiedGuardianLinks: verifiedLinks,
            },
            auditEvents,
          }
        : {
            linkedChildren: Math.max(0, scope.userIds.length - 1),
          }),
    });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /api/v1/analytics/incidents.csv — real, role-scoped export      */
/* ------------------------------------------------------------------ */

analyticsRouter.get(
  '/incidents.csv',
  asyncHandler(async (req, res) => {
    const q = exportSchema.parse(req.query);
    const range = resolveRange(q.from, q.to);
    const scope = await resolveDataScope(req, q.ownerId);

    const filter: Record<string, unknown> = {
      ...scopeFilter(scope),
      startedAt: { $gte: range.from, $lte: range.to },
    };
    if (q.status) filter.status = q.status;
    if (q.type) filter.type = q.type;

    const total = await Incident.countDocuments(filter);
    const rows = await Incident.find(filter).sort({ startedAt: -1 }).limit(5000).lean();

    const header = [
      'incident_id',
      'client_incident_id',
      'owner_user_id',
      'type',
      'severity',
      'status',
      'started_at',
      'received_at',
      'offline_created',
      'offline_delay_seconds',
      'latitude',
      'longitude',
      'accuracy_meters',
      'acknowledged_at',
      'resolved_at',
      'escalation_level',
      'description',
    ];

    const lines = rows.map((incident) =>
      [
        incident._id.toString(),
        incident.clientIncidentId,
        incident.userId.toString(),
        incident.type,
        incident.severity,
        incident.status,
        incident.startedAt.toISOString(),
        incident.receivedAt.toISOString(),
        incident.offlineCreated,
        incident.offlineCreated
          ? Math.max(
              0,
              Math.round(
                (incident.receivedAt.getTime() -
                  (incident.clientCreatedAt ?? incident.startedAt).getTime()) /
                  1000,
              ),
            )
          : 0,
        incident.location?.lat ?? '',
        incident.location?.lng ?? '',
        incident.location?.accuracyMeters ?? '',
        incident.acknowledgedAt ? incident.acknowledgedAt.toISOString() : '',
        incident.resolvedAt ? incident.resolvedAt.toISOString() : '',
        incident.escalationLevel,
        incident.description,
      ]
        .map(csvCell)
        .join(','),
    );

    await audit(req, {
      action: 'ANALYTICS_EXPORTED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'incident_export',
      detail: `exported ${rows.length}/${total} incidents (${range.from.toISOString()}..${range.to.toISOString()})`,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="suraksha-incidents-${range.from.toISOString().slice(0, 10)}_${range.to
        .toISOString()
        .slice(0, 10)}.csv"`,
    );
    res.setHeader('X-Export-Rows', String(rows.length));
    res.setHeader('X-Export-Total', String(total));
    if (total > rows.length) res.setHeader('X-Export-Truncated', 'true');
    // BOM keeps Excel happy with UTF-8.
    res.send(`\uFEFF${[header.join(','), ...lines].join('\r\n')}`);
  }),
);

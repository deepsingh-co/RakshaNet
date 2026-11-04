import { Router } from 'express';
import { z } from 'zod';
import { AUDIT_ACTIONS, AuditLog } from '../models/AuditLog.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.js';

/**
 * Read-only audit log API. There is deliberately no write or delete route:
 * audit rows are created only by the audit service inside trusted code.
 */
export const auditRouter = Router();
auditRouter.use(requireAuth, requireRole('ADMIN'));

const HEX_ID = /^[a-f0-9]{24}$/i;

const listSchema = z.object({
  action: z.enum(AUDIT_ACTIONS).optional(),
  actorId: z.string().regex(HEX_ID).optional(),
  actorRole: z.string().trim().max(30).optional(),
  resourceType: z.string().trim().max(60).optional(),
  resourceId: z.string().trim().max(120).optional(),
  outcome: z.enum(['SUCCESS', 'FAILURE']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

function toAuditLog(log: InstanceType<typeof AuditLog>) {
  return {
    id: log._id.toString(),
    actorId: log.actorId ? log.actorId.toString() : null,
    actorRole: log.actorRole,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    detail: log.detail,
    outcome: log.outcome,
    ip: log.ip,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* GET /api/v1/audit/actions — filter metadata                         */
/* ------------------------------------------------------------------ */

auditRouter.get('/actions', (_req, res) => {
  res.json({ actions: AUDIT_ACTIONS });
});

/* ------------------------------------------------------------------ */
/* GET /api/v1/audit — paginated, filterable                           */
/* ------------------------------------------------------------------ */

auditRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listSchema.parse(req.query);

    const filter: Record<string, unknown> = {};
    if (q.action) filter.action = q.action;
    if (q.actorId) filter.actorId = q.actorId;
    if (q.actorRole) filter.actorRole = q.actorRole;
    if (q.resourceType) filter.resourceType = q.resourceType;
    if (q.resourceId) filter.resourceId = q.resourceId;
    if (q.outcome) filter.outcome = q.outcome;
    if (q.from || q.to) {
      filter.createdAt = {
        ...(q.from ? { $gte: q.from } : {}),
        ...(q.to ? { $lte: q.to } : {}),
      };
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
    ]);

    await audit(req, {
      action: 'ADMIN_ACTION',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'audit_log',
      detail: `viewed audit logs (${total} matching)`,
    });

    res.json({
      logs: logs.map(toAuditLog),
      pagination: { total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) },
    });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /api/v1/audit/:id — single immutable record                     */
/* ------------------------------------------------------------------ */

auditRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!HEX_ID.test(req.params.id ?? '')) {
      throw new ApiError(404, 'NOT_FOUND', 'Audit log not found');
    }
    const log = await AuditLog.findById(req.params.id);
    if (!log) throw new ApiError(404, 'NOT_FOUND', 'Audit log not found');

    await audit(req, {
      action: 'ADMIN_ACTION',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'audit_log',
      resourceId: log._id.toString(),
      detail: 'viewed audit log detail',
    });

    res.json({ log: toAuditLog(log) });
  }),
);

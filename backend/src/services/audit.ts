import type { Request } from 'express';
import { AuditLog, type AuditAction } from '../models/AuditLog.js';
import type { Types } from 'mongoose';

/**
 * Append-only audit write. Failures are logged but never break the
 * request — except we DO surface them in development.
 */
export async function audit(
  req: Request | null,
  input: {
    action: AuditAction;
    actorId?: Types.ObjectId | string | null;
    actorRole?: string;
    resourceType?: string;
    resourceId?: string;
    detail?: string;
    outcome?: 'SUCCESS' | 'FAILURE';
  },
): Promise<void> {
  try {
    await AuditLog.create({
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? '',
      action: input.action,
      resourceType: input.resourceType ?? '',
      resourceId: input.resourceId ?? '',
      detail: input.detail ?? '',
      outcome: input.outcome ?? 'SUCCESS',
      ip: req?.ip ?? '',
      userAgent: (req?.get('user-agent') ?? '').slice(0, 300),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] write failed:', (err as Error).message);
  }
}

import type { Request } from 'express';
import { Types } from 'mongoose';
import { GuardianLink } from '../models/GuardianLink.js';
import { ApiError } from '../middleware/error.js';

export interface DataScope {
  /** ADMIN sees everything (unless a specific owner is requested). */
  all: boolean;
  /** Owners whose incidents/notifications the viewer may read. */
  userIds: Types.ObjectId[];
}

const HEX_ID = /^[a-f0-9]{24}$/i;

/**
 * Resolve what a dashboard viewer is allowed to read.
 * - ADMIN: everything, or one owner on request.
 * - GUARDIAN: self + children with a VERIFIED link.
 * - USER: only self.
 */
export async function resolveDataScope(req: Request, ownerId?: string): Promise<DataScope> {
  const auth = req.auth;
  if (!auth) throw new ApiError(401, 'UNAUTHENTICATED', 'Missing bearer token');

  if (ownerId && !HEX_ID.test(ownerId)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid ownerId');
  }

  if (auth.role === 'ADMIN') {
    return ownerId
      ? { all: false, userIds: [new Types.ObjectId(ownerId)] }
      : { all: true, userIds: [] };
  }

  const userIds = [new Types.ObjectId(auth.sub)];
  if (auth.role === 'GUARDIAN') {
    const links = await GuardianLink.find({
      guardianId: auth.sub,
      status: 'VERIFIED',
    }).select('childId');
    for (const link of links) {
      if (!userIds.some((id) => id.toString() === link.childId.toString())) {
        userIds.push(link.childId);
      }
    }
  }

  if (ownerId) {
    if (!userIds.some((id) => id.toString() === ownerId)) {
      throw new ApiError(403, 'FORBIDDEN', 'You cannot read these records');
    }
    return { all: false, userIds: [new Types.ObjectId(ownerId)] };
  }

  return { all: false, userIds };
}

/** Mongo filter fragment for owner-scoped collections. */
export function scopeFilter(scope: DataScope): Record<string, unknown> {
  return scope.all ? {} : { userId: { $in: scope.userIds } };
}

import type { Request } from 'express';
import { Incident } from '../models/Incident.js';
import { GuardianLink } from '../models/GuardianLink.js';
import { ApiError } from '../middleware/error.js';

export type ViewerRelation = 'OWNER' | 'GUARDIAN' | 'ADMIN';

export interface IncidentAccess {
  incident: InstanceType<typeof Incident>;
  relation: ViewerRelation;
}

/**
 * Load an incident the viewer is allowed to see.
 *
 * Owners see their own incidents; verified guardians see their linked
 * child's incidents; admins see everything. Everyone else gets 404 rather
 * than 403 so incident existence is not leaked.
 */
export async function loadIncidentForViewer(
  req: Request,
  incidentId: string,
): Promise<IncidentAccess> {
  const auth = req.auth;
  if (!auth) throw new ApiError(401, 'UNAUTHENTICATED', 'Missing bearer token');

  if (!/^[a-f0-9]{24}$/i.test(incidentId)) {
    throw new ApiError(404, 'NOT_FOUND', 'Incident not found');
  }

  const incident = await Incident.findById(incidentId);
  if (!incident) throw new ApiError(404, 'NOT_FOUND', 'Incident not found');

  if (incident.userId.toString() === auth.sub) {
    return { incident, relation: 'OWNER' };
  }
  if (auth.role === 'ADMIN') {
    return { incident, relation: 'ADMIN' };
  }

  const link = await GuardianLink.findOne({
    guardianId: auth.sub,
    childId: incident.userId,
    status: 'VERIFIED',
  });
  if (link) return { incident, relation: 'GUARDIAN' };

  throw new ApiError(404, 'NOT_FOUND', 'Incident not found');
}

/** Check access to another user's incident list (guardian/admin). */
export async function canViewUserIncidents(
  req: Request,
  ownerId: string,
): Promise<'SELF' | 'GUARDIAN' | 'ADMIN'> {
  const auth = req.auth;
  if (!auth) throw new ApiError(401, 'UNAUTHENTICATED', 'Missing bearer token');

  if (ownerId === auth.sub) return 'SELF';
  if (auth.role === 'ADMIN') return 'ADMIN';

  if (!/^[a-f0-9]{24}$/i.test(ownerId)) {
    throw new ApiError(403, 'FORBIDDEN', 'You cannot view these incidents');
  }
  const link = await GuardianLink.findOne({
    guardianId: auth.sub,
    childId: ownerId,
    status: 'VERIFIED',
  });
  if (link) return 'GUARDIAN';

  throw new ApiError(403, 'FORBIDDEN', 'You cannot view these incidents');
}

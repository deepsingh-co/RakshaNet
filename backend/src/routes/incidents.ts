import { Router, type Request } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import {
  ACTIVE_INCIDENT_STATUSES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  canTransition,
  type IncidentStatus,
} from '../models/Incident.js';
import { Incident } from '../models/Incident.js';
import { Location } from '../models/Location.js';
import { Notification } from '../models/Notification.js';
import { LOCATION_SOURCES } from '../models/Incident.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.js';
import { loadIncidentForViewer } from '../services/incidentAccess.js';
import { resolveDataScope, scopeFilter } from '../services/scope.js';
import {
  dispatchIncidentAlerts,
  summarizeNotifications,
} from '../services/notificationDispatch.js';
import { emitToAdmins, emitToIncident, emitToUser } from '../services/realtime.js';
import {
  toIncident,
  toLocation,
  toNotification,
  toOwner,
} from '../services/incidentView.js';
import { env } from '../config/env.js';

export const incidentsRouter = Router();
incidentsRouter.use(requireAuth);

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

const isoDate = z.coerce.date();

const locationBaseSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(100_000).nullish(),
  speedMps: z.number().min(0).max(1_000).nullish(),
  headingDeg: z.number().min(0).max(360).nullish(),
  batteryLevel: z.number().min(0).max(100).nullish(),
  source: z.enum(LOCATION_SOURCES).default('GPS'),
  capturedAt: isoDate,
  offlineCaptured: z.boolean().optional().default(false),
});

const locationSchema = locationBaseSchema.extend({
  clientLocationId: z.string().trim().min(3).max(120).optional(),
});

const locationAppendSchema = locationBaseSchema.extend({
  clientLocationId: z.string().trim().min(3).max(120),
});

const deviceSchema = z.object({
  platform: z.string().trim().max(40).default(''),
  model: z.string().trim().max(80).default(''),
  appVersion: z.string().trim().max(40).default(''),
});

const createIncidentSchema = z.object({
  clientIncidentId: z.string().trim().min(3).max(100),
  type: z.enum(INCIDENT_TYPES).default('SOS'),
  severity: z.enum(INCIDENT_SEVERITIES).optional(),
  description: z.string().trim().max(500).optional().default(''),
  startedAt: isoDate,
  clientCreatedAt: isoDate.optional(),
  offlineCreated: z.boolean().optional().default(false),
  location: locationSchema.optional(),
  locations: z.array(locationSchema).max(50).optional(),
  device: deviceSchema.optional(),
});

type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

const listQuerySchema = z.object({
  status: z.enum(INCIDENT_STATUSES).optional(),
  type: z.enum(INCIDENT_TYPES).optional(),
  ownerId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  offlineOnly: z.enum(['true', 'false']).optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const syncSchema = z.object({
  incidents: z.array(z.unknown()).min(1).max(20),
});

const statusUpdateSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'RESPONDING', 'ESCALATED', 'RESOLVED', 'CANCELLED']),
  note: z.string().trim().max(500).optional().default(''),
});

const noteSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function defaultSeverity(type: CreateIncidentInput['type']): string {
  switch (type) {
    case 'SOS':
      return 'CRITICAL';
    case 'FALL_DETECTED':
    case 'VOICE_TRIGGER':
      return 'HIGH';
    case 'MANUAL':
      return 'MEDIUM';
  }
}

async function currentUser(req: Request) {
  if (!req.auth) throw new ApiError(401, 'UNAUTHENTICATED', 'Missing bearer token');
  const user = await User.findById(req.auth.sub);
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Account no longer exists');
  return user;
}

async function saveLocationPoint(
  incident: InstanceType<typeof Incident>,
  input: z.infer<typeof locationSchema>,
  fallbackId: string,
  offlineCaptured: boolean,
): Promise<{ location: InstanceType<typeof Location>; deduplicated: boolean }> {
  const clientLocationId = input.clientLocationId ?? fallbackId;
  const capturedAt = input.capturedAt;
  const isStale =
    Date.now() - capturedAt.getTime() > env.LOCATION_STALE_AFTER_SECONDS * 1000;

  let location = await Location.findOne({
    incidentId: incident._id,
    clientLocationId,
  });
  let deduplicated = true;

  if (!location) {
    try {
      location = await Location.create({
        incidentId: incident._id,
        userId: incident.userId,
        clientLocationId,
        lat: input.lat,
        lng: input.lng,
        accuracyMeters: input.accuracyMeters ?? null,
        speedMps: input.speedMps ?? null,
        headingDeg: input.headingDeg ?? null,
        batteryLevel: input.batteryLevel ?? null,
        source: input.source,
        capturedAt,
        receivedAt: new Date(),
        isStale,
        offlineCaptured: offlineCaptured || input.offlineCaptured,
      });
      deduplicated = false;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      location = await Location.findOne({ incidentId: incident._id, clientLocationId });
    }
  }

  if (location && !deduplicated) {
    const currentAt = incident.location?.capturedAt
      ? new Date(incident.location.capturedAt).getTime()
      : 0;
    if (capturedAt.getTime() > currentAt) {
      incident.location = {
        lat: input.lat,
        lng: input.lng,
        accuracyMeters: input.accuracyMeters ?? null,
        capturedAt,
        source: input.source,
      };
      await incident.save();
    }

    const payload = {
      incidentId: incident._id.toString(),
      location: toLocation(location),
    };
    emitToIncident(incident._id.toString(), 'incident:location_updated', payload);
    emitToUser(incident.userId.toString(), 'incident:location_updated', payload);
    if (!isStale) {
      emitToAdmins('incident:location_updated', payload);
    }
  }

  if (!location) {
    throw new ApiError(500, 'INTERNAL', 'Could not store location');
  }
  return { location, deduplicated };
}

function incidentPayload(
  incident: InstanceType<typeof Incident>,
  deduplicated: boolean,
  notifications: Awaited<ReturnType<typeof summarizeNotifications>>,
) {
  return {
    incident: toIncident(incident),
    deduplicated,
    notifications,
    offlineDelaySeconds: toIncident(incident).offlineDelaySeconds,
  };
}

async function createIncidentForUser(
  req: Request,
  user: Awaited<ReturnType<typeof currentUser>>,
  input: CreateIncidentInput,
) {
  const existing = await Incident.findOne({
    userId: user._id,
    clientIncidentId: input.clientIncidentId,
  });
  if (existing) {
    return incidentPayload(
      existing,
      true,
      await summarizeNotifications(existing._id),
    );
  }

  const now = new Date();
  const clientCreatedAt = input.clientCreatedAt ?? input.startedAt;
  const initialStatus: IncidentStatus = input.offlineCreated ? 'PENDING_SYNC' : 'ALERTING';

  let incident: InstanceType<typeof Incident>;
  try {
    incident = await Incident.create({
      userId: user._id,
      clientIncidentId: input.clientIncidentId,
      type: input.type,
      severity: input.severity ?? defaultSeverity(input.type),
      status: initialStatus,
      description: input.description ?? '',
      startedAt: input.startedAt,
      clientCreatedAt,
      receivedAt: now,
      offlineCreated: input.offlineCreated ?? false,
      syncedFromOffline: Boolean(input.offlineCreated),
      statusHistory: [
        {
          status: 'CREATED',
          at: clientCreatedAt,
          byUserId: user._id,
          byRole: 'USER',
          note: input.offlineCreated ? 'created on device while offline' : 'created on device',
        },
        {
          status: initialStatus,
          at: now,
          byUserId: null,
          byRole: 'SYSTEM',
          note: input.offlineCreated
            ? 'offline record received by server — preparing alerts'
            : 'alerting trusted contacts',
        },
      ],
      device: input.device ?? null,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      const duplicate = await Incident.findOne({
        userId: user._id,
        clientIncidentId: input.clientIncidentId,
      });
      if (duplicate) {
        return incidentPayload(
          duplicate,
          true,
          await summarizeNotifications(duplicate._id),
        );
      }
    }
    throw err;
  }

  if (input.location) {
    await saveLocationPoint(
      incident,
      input.location,
      `${input.clientIncidentId}:initial`,
      Boolean(input.offlineCreated),
    );
  }
  if (input.locations) {
    for (let i = 0; i < input.locations.length; i += 1) {
      const point = input.locations[i];
      if (!point) continue;
      await saveLocationPoint(
        incident,
        point,
        `${input.clientIncidentId}:loc:${i}`,
        Boolean(input.offlineCreated),
      );
    }
  }

  // A record that arrived from an offline device is promoted to ALERTING
  // only once the server is actually ready to alert — the history keeps
  // the offline gap visible.
  if (incident.status === 'PENDING_SYNC') {
    incident.status = 'ALERTING';
    incident.statusHistory.push({
      status: 'ALERTING',
      at: new Date(),
      byUserId: null,
      byRole: 'SYSTEM',
      note: 'offline incident synced — alerting now',
    });
    await incident.save();
  }

  const notifications = await dispatchIncidentAlerts(incident, user);

  await audit(req, {
    action: 'INCIDENT_CREATED',
    actorId: user._id,
    actorRole: req.auth?.role ?? user.role,
    resourceType: 'incident',
    resourceId: incident._id.toString(),
    detail: `type=${incident.type} offline=${incident.offlineCreated} notifications=${notifications.total} sent=${notifications.sent} failed=${notifications.failed}`,
  });

  const payload = incidentPayload(incident, false, notifications);
  payload.incident.owner = toOwner(user);
  emitToAdmins('incident:created', payload.incident);
  emitToUser(incident.userId.toString(), 'incident:created', payload.incident);

  return payload;
}

/* ------------------------------------------------------------------ */
/* POST /incidents — create (idempotent by clientIncidentId)           */
/* ------------------------------------------------------------------ */

incidentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const input = createIncidentSchema.parse(req.body);
    const result = await createIncidentForUser(req, user, input);
    res.status(result.deduplicated ? 200 : 201).json(result);
  }),
);

/* ------------------------------------------------------------------ */
/* POST /incidents/sync — offline batch upload                         */
/* ------------------------------------------------------------------ */

incidentsRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const { incidents } = syncSchema.parse(req.body);

    const results: Array<Record<string, unknown>> = [];
    let accepted = 0;
    let duplicates = 0;
    let failed = 0;

    for (const raw of incidents) {
      const rawId =
        typeof raw === 'object' && raw !== null && 'clientIncidentId' in raw
          ? String((raw as { clientIncidentId?: unknown }).clientIncidentId ?? '')
          : '';
      const parsed = createIncidentSchema.safeParse(raw);
      if (!parsed.success) {
        failed += 1;
        results.push({
          ok: false,
          clientIncidentId: rawId,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid incident payload',
            details: parsed.error.flatten(),
          },
        });
        continue;
      }
      try {
        const result = await createIncidentForUser(req, user, parsed.data);
        if (result.deduplicated) duplicates += 1;
        else accepted += 1;
        results.push({
          ok: true,
          clientIncidentId: parsed.data.clientIncidentId,
          serverId: result.incident.id,
          status: result.incident.status,
          deduplicated: result.deduplicated,
          notifications: result.notifications,
          offlineDelaySeconds: result.offlineDelaySeconds,
        });
      } catch (err) {
        failed += 1;
        results.push({
          ok: false,
          clientIncidentId: parsed.data.clientIncidentId,
          error: {
            code: err instanceof ApiError ? err.code : 'INTERNAL',
            message: err instanceof Error ? err.message : 'Could not sync incident',
          },
        });
      }
    }

    await audit(req, {
      action: 'INCIDENT_CREATED',
      actorId: user._id,
      actorRole: req.auth?.role ?? user.role,
      resourceType: 'incident_sync',
      detail: `batch accepted=${accepted} duplicates=${duplicates} failed=${failed}`,
    });

    res.status(207).json({ results, accepted, duplicates, failed });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /incidents — own, child (guardian), or all (admin)              */
/* ------------------------------------------------------------------ */

incidentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);

    // Guardians see their own incidents plus those of VERIFIED children.
    // Explicit ownerId narrows (and is access-checked) inside resolveDataScope.
    const scope = await resolveDataScope(req, q.ownerId);
    const filter: Record<string, unknown> = scopeFilter(scope);

    if (q.status) filter.status = q.status;
    else if (q.active === 'true') filter.status = { $in: ACTIVE_INCIDENT_STATUSES };
    else if (q.active === 'false') filter.status = { $nin: ACTIVE_INCIDENT_STATUSES };
    if (q.type) filter.type = q.type;
    if (q.offlineOnly === 'true') filter.offlineCreated = true;
    if (q.from || q.to) {
      filter.startedAt = {
        ...(q.from ? { $gte: q.from } : {}),
        ...(q.to ? { $lte: q.to } : {}),
      };
    }

    const [total, incidents] = await Promise.all([
      Incident.countDocuments(filter),
      Incident.find(filter)
        .populate('userId', 'fullName email phone role accountType')
        .sort({ startedAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
    ]);

    res.json({
      incidents: incidents.map(toIncident),
      pagination: { total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) },
    });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /incidents/:id — detail with locations + notification truth     */
/* ------------------------------------------------------------------ */

incidentsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { incident, relation } = await loadIncidentForViewer(req, req.params.id ?? '');

    const [locations, notifications, notificationSummary, owner] = await Promise.all([
      Location.find({ incidentId: incident._id }).sort({ capturedAt: -1 }).limit(100),
      Notification.find({ incidentId: incident._id }).sort({ queuedAt: 1 }).limit(200),
      summarizeNotifications(incident._id),
      User.findById(incident.userId).select('fullName email phone role accountType'),
    ]);

    await audit(req, {
      action: 'LOCATION_ACCESSED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      detail: `viewed incident detail as ${relation.toLowerCase()}`,
    });

    res.json({
      incident: { ...toIncident(incident), owner: owner ? toOwner(owner) : null },
      viewerRelation: relation,
      locations: locations.map(toLocation),
      notifications: notifications.map(toNotification),
      notificationSummary,
    });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /incidents/:id/notifications — delivery truth                   */
/* ------------------------------------------------------------------ */

incidentsRouter.get(
  '/:id/notifications',
  asyncHandler(async (req, res) => {
    const { incident } = await loadIncidentForViewer(req, req.params.id ?? '');
    const [notifications, summary] = await Promise.all([
      Notification.find({ incidentId: incident._id }).sort({ queuedAt: 1 }).limit(200),
      summarizeNotifications(incident._id),
    ]);
    res.json({ notifications: notifications.map(toNotification), summary });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /incidents/:id/locations — append a location ping              */
/* ------------------------------------------------------------------ */

incidentsRouter.post(
  '/:id/locations',
  asyncHandler(async (req, res) => {
    const { incident, relation } = await loadIncidentForViewer(req, req.params.id ?? '');
    const input = locationAppendSchema.parse(req.body);

    // Guardians may follow a child's location but must never inject points
    // into the child's incident — location writes belong to the device owner.
    if (relation !== 'OWNER') {
      throw new ApiError(403, 'FORBIDDEN', 'Only the incident owner can add location points');
    }

    if (incident.status === 'RESOLVED' || incident.status === 'CANCELLED') {
      throw new ApiError(409, 'INCIDENT_CLOSED', 'This incident is closed');
    }

    const result = await saveLocationPoint(
      incident,
      input,
      input.clientLocationId,
      input.offlineCaptured,
    );

    await audit(req, {
      action: 'LOCATION_UPDATED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      detail: `location ${result.deduplicated ? 'duplicate ignored' : 'appended'}${result.location.isStale ? ' (stale capture)' : ''}`,
    });

    res.status(result.deduplicated ? 200 : 201).json({
      location: toLocation(result.location),
      deduplicated: result.deduplicated,
      incidentLocation: incident.location ?? null,
    });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /incidents/:id/locations/batch — offline location flush        */
/* ------------------------------------------------------------------ */

incidentsRouter.post(
  '/:id/locations/batch',
  asyncHandler(async (req, res) => {
    const { incident, relation } = await loadIncidentForViewer(req, req.params.id ?? '');
    const body = z
      .object({ locations: z.array(locationAppendSchema).min(1).max(100) })
      .parse(req.body);

    if (relation !== 'OWNER') {
      throw new ApiError(403, 'FORBIDDEN', 'Only the incident owner can add location points');
    }

    if (incident.status === 'RESOLVED' || incident.status === 'CANCELLED') {
      throw new ApiError(409, 'INCIDENT_CLOSED', 'This incident is closed');
    }

    let accepted = 0;
    let duplicates = 0;
    const stored: ReturnType<typeof toLocation>[] = [];

    for (const input of body.locations) {
      const result = await saveLocationPoint(
        incident,
        input,
        input.clientLocationId,
        input.offlineCaptured,
      );
      if (result.deduplicated) duplicates += 1;
      else accepted += 1;
      stored.push(toLocation(result.location));
    }

    await audit(req, {
      action: 'LOCATION_UPDATED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      detail: `batch location sync accepted=${accepted} duplicates=${duplicates}`,
    });

    res.status(207).json({ accepted, duplicates, locations: stored });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /incidents/:id/locations — location timeline                    */
/* ------------------------------------------------------------------ */

incidentsRouter.get(
  '/:id/locations',
  asyncHandler(async (req, res) => {
    const { incident } = await loadIncidentForViewer(req, req.params.id ?? '');
    const q = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(200).default(100),
      })
      .parse(req.query);

    const [total, locations] = await Promise.all([
      Location.countDocuments({ incidentId: incident._id }),
      Location.find({ incidentId: incident._id })
        .sort({ capturedAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
    ]);

    await audit(req, {
      action: 'LOCATION_ACCESSED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      detail: `location history viewed (${total} points)`,
    });

    res.json({
      locations: locations.map(toLocation),
      pagination: { total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) },
    });
  }),
);

/* ------------------------------------------------------------------ */
/* PATCH /incidents/:id/status — lifecycle transition                  */
/* ------------------------------------------------------------------ */

incidentsRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { incident, relation } = await loadIncidentForViewer(req, req.params.id ?? '');
    const input = statusUpdateSchema.parse(req.body);
    const auth = req.auth!;

    if (input.status === 'CANCELLED' && relation === 'GUARDIAN') {
      throw new ApiError(403, 'FORBIDDEN', 'Only the owner or an administrator can cancel');
    }
    if (
      (input.status === 'RESPONDING' || input.status === 'ESCALATED') &&
      relation === 'OWNER'
    ) {
      throw new ApiError(403, 'FORBIDDEN', 'Only a guardian or administrator can do that');
    }
    if (!canTransition(incident.status, input.status)) {
      throw new ApiError(
        409,
        'INVALID_TRANSITION',
        `Cannot move an incident from ${incident.status} to ${input.status}`,
      );
    }

    incident.status = input.status;
    incident.statusHistory.push({
      status: input.status,
      at: new Date(),
      byUserId: auth.sub,
      byRole: auth.role,
      note: input.note,
    });

    if (input.status === 'ACKNOWLEDGED') {
      incident.acknowledgedBy = new Types.ObjectId(auth.sub);
      incident.acknowledgedAt = new Date();
    }
    if (input.status === 'RESOLVED') {
      incident.resolvedBy = new Types.ObjectId(auth.sub);
      incident.resolvedAt = new Date();
    }
    if (input.status === 'CANCELLED') {
      incident.cancelledAt = new Date();
    }
    await incident.save();

    await audit(req, {
      action:
        input.status === 'ACKNOWLEDGED'
          ? 'INCIDENT_ACKNOWLEDGED'
          : input.status === 'RESOLVED'
            ? 'INCIDENT_RESOLVED'
            : 'INCIDENT_STATUS_CHANGED',
      actorId: auth.sub,
      actorRole: auth.role,
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      detail: `status=${input.status} as ${relation.toLowerCase()}`,
    });

    const owner = await User.findById(incident.userId).select(
      'fullName email phone role accountType',
    );
    const payload = { ...toIncident(incident), owner: owner ? toOwner(owner) : null };
    emitToUser(incident.userId.toString(), 'incident:status_changed', payload);
    emitToIncident(incident._id.toString(), 'incident:status_changed', payload);
    emitToAdmins('incident:updated', payload);
    if (input.status === 'ACKNOWLEDGED') {
      emitToIncident(incident._id.toString(), 'incident:acknowledged', payload);
      emitToUser(incident.userId.toString(), 'incident:acknowledged', payload);
    }
    if (input.status === 'RESOLVED') {
      emitToIncident(incident._id.toString(), 'incident:resolved', payload);
      emitToUser(incident.userId.toString(), 'incident:resolved', payload);
    }
    if (input.status === 'CANCELLED') {
      emitToIncident(incident._id.toString(), 'incident:cancelled', payload);
      emitToUser(incident.userId.toString(), 'incident:cancelled', payload);
    }

    res.json({ incident: payload });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /incidents/:id/notes — responder note                          */
/* ------------------------------------------------------------------ */

incidentsRouter.post(
  '/:id/notes',
  asyncHandler(async (req, res) => {
    const { incident } = await loadIncidentForViewer(req, req.params.id ?? '');
    const input = noteSchema.parse(req.body);

    if (incident.status === 'RESOLVED' || incident.status === 'CANCELLED') {
      throw new ApiError(409, 'INCIDENT_CLOSED', 'This incident is closed');
    }

    incident.notes.push({
      body: input.body,
      byUserId: new Types.ObjectId(req.auth!.sub),
      byRole: req.auth!.role,
      at: new Date(),
    });
    await incident.save();

    await audit(req, {
      action: 'INCIDENT_NOTE_ADDED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'incident',
      resourceId: incident._id.toString(),
    });

    const owner = await User.findById(incident.userId).select(
      'fullName email phone role accountType',
    );
    const payload = { ...toIncident(incident), owner: owner ? toOwner(owner) : null };
    emitToIncident(incident._id.toString(), 'incident:note_added', payload);
    emitToUser(incident.userId.toString(), 'incident:note_added', payload);
    emitToAdmins('incident:updated', payload);

    res.status(201).json({ incident: payload });
  }),
);

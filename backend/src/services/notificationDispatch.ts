import { Types } from 'mongoose';
import type { Incident } from '../models/Incident.js';
import { Notification, type NotificationChannel } from '../models/Notification.js';
import { TrustedContact, maskPhone } from '../models/TrustedContact.js';
import type { User } from '../models/User.js';
import {
  NotificationProviderError,
  buildAlertMessage,
  sendNotification,
} from './notificationProvider.js';
import { emitToAdmins, emitToIncident, emitToUser } from './realtime.js';
import { toIncident, toNotification } from './incidentView.js';

type IncidentInstance = InstanceType<typeof Incident>;
type UserInstance = InstanceType<typeof User>;

export interface NotificationSummary {
  total: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  simulated: number;
}

export interface DispatchOptions {
  /** Distinguishes initial alerts from escalation rounds. */
  phase?: string;
  primaryOnly?: boolean;
  messagePrefix?: string;
}

const ALERT_MESSAGE_MAX = 900;

function channelsFor(contact: InstanceType<typeof TrustedContact>): NotificationChannel[] {
  // Contacts only have phone destinations today. Push is reserved for
  // registered app users once device-token registration ships.
  const channels: NotificationChannel[] = [];
  if (contact.notificationPreferences?.whatsapp) channels.push('WHATSAPP');
  if (contact.notificationPreferences?.sms) channels.push('SMS');
  return channels;
}

async function upsertNotification(input: {
  incidentId: Types.ObjectId;
  userId: Types.ObjectId;
  contactId: Types.ObjectId;
  channel: NotificationChannel;
  destination: string;
  key: string;
}): Promise<InstanceType<typeof Notification> | null> {
  try {
    return await Notification.findOneAndUpdate(
      { idempotencyKey: input.key },
      {
        $setOnInsert: {
          incidentId: input.incidentId,
          userId: input.userId,
          contactId: input.contactId,
          channel: input.channel,
          destinationMasked: maskPhone(input.destination),
          status: 'QUEUED',
          provider: '',
          providerMessageId: '',
          simulated: false,
          attempts: 0,
          lastError: '',
          queuedAt: new Date(),
          idempotencyKey: input.key,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return Notification.findOne({ idempotencyKey: input.key });
    }
    throw err;
  }
}

/**
 * Claim and send one notification. Atomic claim prevents double sends when
 * a retry races with the original dispatch.
 */
export async function processNotification(
  notificationId: Types.ObjectId,
  message: string,
  incidentId: Types.ObjectId,
  ownerId: Types.ObjectId,
): Promise<InstanceType<typeof Notification> | null> {
  const claimed = await Notification.findOneAndUpdate(
    { _id: notificationId, status: { $in: ['QUEUED', 'PENDING_SYNC'] } },
    { $set: { status: 'SENDING' }, $inc: { attempts: 1 } },
    { new: true },
  );
  // Already sent/failed/delivered — idempotent no-op.
  if (!claimed) return Notification.findById(notificationId);

  const contact = claimed.contactId ? await TrustedContact.findById(claimed.contactId) : null;
  const destination = contact?.phone ?? '';

  try {
    if (!destination) {
      throw new NotificationProviderError('NO_DESTINATION', 'Recipient has no phone destination');
    }
    const result = await sendNotification({
      channel: claimed.channel,
      destination,
      message,
      incidentId: incidentId.toString(),
    });
    const updated = await Notification.findByIdAndUpdate(
      notificationId,
      {
        $set: {
          status: 'SENT',
          sentAt: new Date(),
          provider: result.provider,
          providerMessageId: result.providerMessageId,
          simulated: result.simulated,
          lastError: '',
        },
      },
      { new: true },
    );
    if (updated) {
      emitToUser(ownerId.toString(), 'notification:updated', toNotification(updated));
      emitToIncident(incidentId.toString(), 'notification:updated', toNotification(updated));
    }
    return updated;
  } catch (err) {
    const failure = err as NotificationProviderError;
    const updated = await Notification.findByIdAndUpdate(
      notificationId,
      {
        $set: {
          status: 'FAILED',
          failedAt: new Date(),
          lastError: failure.message ?? 'send failed',
          provider:
            failure.code === 'PROVIDER_NOT_CONFIGURED' ? 'unconfigured' : claimed.provider,
        },
      },
      { new: true },
    );
    if (updated) {
      emitToUser(ownerId.toString(), 'notification:updated', toNotification(updated));
      emitToIncident(incidentId.toString(), 'notification:updated', toNotification(updated));
    }
    return updated;
  }
}

async function runInChunks<T>(items: T[], size: number, fn: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

export async function summarizeNotifications(
  incidentId: Types.ObjectId,
): Promise<NotificationSummary> {
  const [total, queued, sent, delivered, failed, simulated] = await Promise.all([
    Notification.countDocuments({ incidentId }),
    Notification.countDocuments({ incidentId, status: { $in: ['QUEUED', 'SENDING', 'PENDING_SYNC'] } }),
    Notification.countDocuments({ incidentId, status: 'SENT' }),
    Notification.countDocuments({ incidentId, status: 'DELIVERED' }),
    Notification.countDocuments({ incidentId, status: 'FAILED' }),
    Notification.countDocuments({ incidentId, simulated: true }),
  ]);
  return { total, queued, sent, delivered, failed, simulated };
}

/**
 * Create delivery rows for every verified trusted contact, send them, then
 * move the incident to NOTIFIED or DELIVERY_FAILED based on real results.
 * If there is nobody verified to notify, the incident honestly ends in
 * DELIVERY_FAILED — never a fake "contacts alerted" state.
 */
export async function dispatchIncidentAlerts(
  incident: IncidentInstance,
  owner: UserInstance,
  options: DispatchOptions = {},
): Promise<NotificationSummary> {
  const phase = options.phase ?? 'initial';
  const contacts = await TrustedContact.find({
    userId: owner._id,
    verificationStatus: 'VERIFIED',
  })
    .sort({ isPrimary: -1, createdAt: 1 })
    .limit(options.primaryOnly ? 1 : 20);

  const baseMessage = buildAlertMessage({
    ownerName: owner.fullName,
    incidentId: incident._id.toString(),
    type: incident.type,
    startedAt: incident.startedAt,
    location: incident.location ?? null,
  });
  const message = `${options.messagePrefix ? `${options.messagePrefix} ` : ''}${baseMessage}`.slice(
    0,
    ALERT_MESSAGE_MAX,
  );

  const ids: Types.ObjectId[] = [];
  for (const contact of contacts) {
    for (const channel of channelsFor(contact)) {
      const key = `${incident._id}:${contact._id}:${channel}:${phase}`;
      const notification = await upsertNotification({
        incidentId: incident._id,
        userId: owner._id,
        contactId: contact._id,
        channel,
        destination: contact.phone,
        key,
      });
      if (notification) ids.push(notification._id);
    }
  }

  await runInChunks(ids, 5, (id) =>
    processNotification(id, message, incident._id, owner._id),
  );

  const summary = await summarizeNotifications(incident._id);

  // Escalation rounds must not rewrite the incident status.
  if (phase !== 'initial') return summary;

  const activeStatuses = ['ALERTING', 'CREATED', 'PENDING_SYNC'];
  if (!activeStatuses.includes(incident.status)) return summary;

  const reachedSomeone = summary.sent + summary.delivered > 0;
  const nextStatus = reachedSomeone ? 'NOTIFIED' : 'DELIVERY_FAILED';
  incident.status = nextStatus;
  incident.statusHistory.push({
    status: nextStatus,
    at: new Date(),
    byUserId: null,
    byRole: 'SYSTEM',
    note:
      summary.total === 0
        ? 'no verified trusted contacts to alert'
        : `notifications total=${summary.total} sent=${summary.sent} delivered=${summary.delivered} failed=${summary.failed}`,
  });
  await incident.save();

  emitToUser(owner._id.toString(), 'incident:status_changed', toIncident(incident));
  emitToIncident(incident._id.toString(), 'incident:status_changed', toIncident(incident));
  emitToAdmins('incident:updated', toIncident(incident));

  return summary;
}

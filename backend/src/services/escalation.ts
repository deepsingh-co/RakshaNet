import { env } from '../config/env.js';
import { Incident } from '../models/Incident.js';
import { User } from '../models/User.js';
import { audit } from './audit.js';
import { dispatchIncidentAlerts } from './notificationDispatch.js';
import { emitToAdmins, emitToIncident, emitToUser } from './realtime.js';
import { toIncident } from './incidentView.js';

/**
 * Escalate alerts that nobody acknowledged. Delivered notifications do not
 * stop escalation — only a human acknowledgement/resolution does.
 *
 * Safe to call concurrently: the status filter + escalation level keep the
 * transition idempotent per round.
 */
export async function escalateStaleIncidents(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - env.ESCALATION_AFTER_SECONDS * 1000);

  const stale = await Incident.find({
    status: { $in: ['ALERTING', 'NOTIFIED'] },
    escalationLevel: { $lt: 3 },
    $or: [
      { lastEscalatedAt: null, receivedAt: { $lt: cutoff } },
      { lastEscalatedAt: { $lt: cutoff } },
    ],
  }).limit(50);

  for (const incident of stale) {
    const previous = incident.status;
    incident.status = 'ESCALATED';
    incident.escalationLevel += 1;
    incident.lastEscalatedAt = now;
    incident.statusHistory.push({
      status: 'ESCALATED',
      at: now,
      byUserId: null,
      byRole: 'SYSTEM',
      note: `auto-escalated from ${previous} (level ${incident.escalationLevel})`,
    });
    await incident.save();

    await audit(null, {
      action: 'INCIDENT_STATUS_CHANGED',
      actorRole: 'SYSTEM',
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      detail: `auto-escalated to level ${incident.escalationLevel}`,
    });

    const payload = toIncident(incident);
    emitToUser(incident.userId.toString(), 'incident:status_changed', payload);
    emitToIncident(incident._id.toString(), 'incident:status_changed', payload);
    emitToAdmins('incident:updated', payload);

    // Re-alert the primary contact for each escalation round with its own
    // idempotency phase.
    const owner = await User.findById(incident.userId);
    if (owner) {
      try {
        await dispatchIncidentAlerts(incident, owner, {
          phase: `escalation-${incident.escalationLevel}`,
          primaryOnly: true,
          messagePrefix: 'ESCALATION:',
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `[escalation] notification round failed for ${incident._id.toString()}:`,
          (err as Error).message,
        );
      }
    }
  }

  return stale.length;
}

/** Background sweeper for the running server (never started in tests). */
export function startEscalationSweeper(intervalMs = 30_000): () => void {
  const timer = setInterval(() => {
    void escalateStaleIncidents().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[escalation] sweep failed:', (err as Error).message);
    });
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

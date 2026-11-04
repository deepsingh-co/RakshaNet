import { useEffect, useRef, useState } from 'react';
import {
  addIncidentNote,
  fetchIncidentDetail,
  updateIncidentStatus,
} from '../lib/api';
import {
  elapsedSince,
  formatDateTime,
  humanDuration,
  notificationTone,
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
  timeAgo,
  titleCase,
  typeLabel,
} from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { useRealtime } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import type { IncidentStatus, ViewerRelation } from '../types';
import { Icon } from './Icons';
import { Badge, ErrorBlock, LoadingBlock, Spinner } from './ui';

const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  CREATED: ['PENDING_SYNC', 'ALERTING', 'CANCELLED'],
  PENDING_SYNC: ['ALERTING', 'CANCELLED'],
  ALERTING: [
    'NOTIFIED',
    'ACKNOWLEDGED',
    'RESPONDING',
    'ESCALATED',
    'RESOLVED',
    'CANCELLED',
    'DELIVERY_FAILED',
  ],
  NOTIFIED: [
    'ACKNOWLEDGED',
    'RESPONDING',
    'ESCALATED',
    'RESOLVED',
    'CANCELLED',
    'DELIVERY_FAILED',
  ],
  ACKNOWLEDGED: ['RESPONDING', 'ESCALATED', 'RESOLVED'],
  RESPONDING: ['ESCALATED', 'RESOLVED'],
  ESCALATED: ['ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'CANCELLED'],
  DELIVERY_FAILED: ['ACKNOWLEDGED', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
};

const ACTION_META: Partial<
  Record<IncidentStatus, { label: string; className: string; confirm?: string }>
> = {
  ACKNOWLEDGED: { label: 'Acknowledge', className: 'btn-primary' },
  RESPONDING: { label: 'Mark responding', className: 'btn-primary' },
  ESCALATED: {
    label: 'Escalate',
    className: 'btn-warning',
    confirm: 'Escalate this incident to the next response level?',
  },
  RESOLVED: {
    label: 'Resolve',
    className: 'btn-success',
    confirm: 'Mark this incident as resolved? This closes the response.',
  },
  CANCELLED: {
    label: 'Cancel incident',
    className: 'btn-danger',
    confirm: 'Cancel this incident? It will close without a response.',
  },
};

function allowedActions(status: IncidentStatus, relation: ViewerRelation): IncidentStatus[] {
  const allowed = TRANSITIONS[status] ?? [];
  return allowed.filter((next) => {
    if (!ACTION_META[next]) return false;
    if (relation === 'OWNER' && (next === 'RESPONDING' || next === 'ESCALATED')) return false;
    if (relation === 'GUARDIAN' && next === 'CANCELLED') return false;
    return true;
  });
}

export function IncidentDrawer({
  incidentId,
  onClose,
  onChanged,
}: {
  incidentId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { revision } = useRealtime();
  const { toast } = useToast();
  const [localTick, setLocalTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const state = useAsyncData(
    (signal) => fetchIncidentDetail(incidentId ?? '', signal),
    [incidentId, revision, localTick],
    Boolean(incidentId),
  );

  const detail =
    state.data && state.data.incident.id === incidentId ? state.data : null;
  const incident = detail?.incident ?? null;

  useEffect(() => {
    if (!incidentId) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [incidentId, onClose]);

  useEffect(() => {
    setNote('');
  }, [incidentId]);

  if (!incidentId) return null;

  const reload = () => {
    setLocalTick((value) => value + 1);
    onChanged?.();
  };

  const changeStatus = async (next: IncidentStatus) => {
    const meta = ACTION_META[next];
    if (!meta) return;
    if (meta.confirm && !window.confirm(meta.confirm)) return;
    setBusy(next);
    try {
      await updateIncidentStatus(incidentId, next);
      toast(`Incident moved to ${statusLabel(next)}.`, 'success');
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Status change failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const submitNote = async () => {
    const body = note.trim();
    if (!body) return;
    setNoteBusy(true);
    try {
      await addIncidentNote(incidentId, body);
      setNote('');
      toast('Responder note added.', 'success');
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add note', 'error');
    } finally {
      setNoteBusy(false);
    }
  };

  const actions = incident && detail ? allowedActions(incident.status, detail.viewerRelation) : [];

  return (
    <div className="drawer-overlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="incident-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-topbar">
          <span className="eyebrow">Incident detail</span>
          <button
            ref={closeRef}
            type="button"
            className="icon-btn"
            aria-label="Close incident detail"
            onClick={onClose}
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        {!detail && state.loading ? <LoadingBlock label="Loading incident detail…" /> : null}
        {!detail && state.error ? (
          <ErrorBlock error={state.error} onRetry={reload} />
        ) : null}

        {detail && incident ? (
          <div className="drawer-scroll">
            <div className="drawer-title">
              <h2 id="incident-drawer-title">{typeLabel(incident.type)}</h2>
              <p className="mono-id">#{incident.id.slice(-8)}</p>
              <div className="badge-row">
                <Badge tone={statusTone(incident.status)} dot>
                  {statusLabel(incident.status)}
                </Badge>
                <Badge tone={severityTone(incident.severity)}>
                  {severityLabel(incident.severity)}
                </Badge>
                {incident.offlineCreated ? <Badge tone="amber">Offline-created</Badge> : null}
                {detail.viewerRelation !== 'ADMIN' ? (
                  <Badge tone="slate">{titleCase(detail.viewerRelation)} view</Badge>
                ) : null}
              </div>
            </div>

            {incident.owner ? (
              <div className="owner-strip">
                <span className="avatar">{incident.owner.fullName.charAt(0)}</span>
                <div>
                  <strong>{incident.owner.fullName}</strong>
                  <span>
                    {incident.owner.email} · {incident.owner.phoneMasked}
                  </span>
                </div>
              </div>
            ) : null}

            <dl className="meta-grid">
              <div>
                <dt>Started</dt>
                <dd title={formatDateTime(incident.startedAt)}>
                  {formatDateTime(incident.startedAt)}
                </dd>
              </div>
              <div>
                <dt>Elapsed</dt>
                <dd>{elapsedSince(incident.startedAt)}</dd>
              </div>
              <div>
                <dt>Received by server</dt>
                <dd>{formatDateTime(incident.receivedAt)}</dd>
              </div>
              <div>
                <dt>Offline delay</dt>
                <dd>
                  {incident.offlineCreated
                    ? humanDuration(incident.offlineDelaySeconds)
                    : 'None — created online'}
                </dd>
              </div>
              <div>
                <dt>Acknowledged</dt>
                <dd>
                  {incident.acknowledgedAt
                    ? `${formatDateTime(incident.acknowledgedAt)} (${timeAgo(incident.acknowledgedAt)})`
                    : 'Not yet'}
                </dd>
              </div>
              <div>
                <dt>Escalation level</dt>
                <dd>{incident.escalationLevel}</dd>
              </div>
            </dl>

            {incident.description ? (
              <p className="incident-description">{incident.description}</p>
            ) : null}

            <section className="drawer-section">
              <h3>
                <Icon name="location" size={16} /> Last known location
              </h3>
              {incident.location ? (
                <div className="location-card">
                  <div className="location-coords">
                    <strong>
                      {incident.location.lat.toFixed(5)}, {incident.location.lng.toFixed(5)}
                    </strong>
                    <span>
                      {incident.location.accuracyMeters != null
                        ? `±${Math.round(incident.location.accuracyMeters)} m · `
                        : ''}
                      {incident.location.source ?? 'GPS'}
                    </span>
                  </div>
                  <span className="muted">
                    Captured{' '}
                    {incident.location.capturedAt
                      ? `${formatDateTime(incident.location.capturedAt)} (${timeAgo(
                          incident.location.capturedAt,
                        )})`
                      : 'time not shared'}
                  </span>
                  {detail.locations[0]?.isStale ? (
                    <Badge tone="amber">Latest ping is stale</Badge>
                  ) : null}
                </div>
              ) : (
                <p className="muted">
                  No GPS fix has been shared for this incident. Location is unknown — do not
                  assume a position.
                </p>
              )}
              {detail.locations.length > 1 ? (
                <p className="muted small">
                  {detail.locations.length} location pings recorded · latest{' '}
                  {timeAgo(detail.locations[0]?.capturedAt)}
                </p>
              ) : null}
            </section>

            <section className="drawer-section">
              <h3>
                <Icon name="activity" size={16} /> Response actions
              </h3>
              {actions.length > 0 ? (
                <div className="action-grid">
                  {actions.map((next) => {
                    const meta = ACTION_META[next]!;
                    return (
                      <button
                        key={next}
                        type="button"
                        className={`btn ${meta.className}`}
                        disabled={busy !== null}
                        onClick={() => void changeStatus(next)}
                      >
                        {busy === next ? <Spinner label="Saving" /> : null}
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="muted">
                  No further lifecycle actions are available from{' '}
                  <strong>{statusLabel(incident.status)}</strong> for your role.
                </p>
              )}
              <p className="muted small">
                Every change is written to the incident timeline and the audit log.
              </p>
            </section>

            <section className="drawer-section">
              <h3>
                <Icon name="bell" size={16} /> Delivery truth
              </h3>
              <div className="delivery-summary">
                <span>
                  <strong>{detail.notificationSummary.delivered}</strong> delivered
                </span>
                <span>
                  <strong>{detail.notificationSummary.sent}</strong> accepted by provider
                </span>
                <span>
                  <strong>{detail.notificationSummary.failed}</strong> failed
                </span>
                {detail.notificationSummary.simulated > 0 ? (
                  <span className="warn-text">
                    {detail.notificationSummary.simulated} simulated
                  </span>
                ) : null}
              </div>
              {detail.notifications.length === 0 ? (
                <p className="muted">
                  No trusted contacts were alerted for this incident. This may mean no verified
                  contact existed.
                </p>
              ) : (
                <ul className="notification-list">
                  {detail.notifications.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.channel}</strong>
                        <span className="muted"> → {item.destinationMasked}</span>
                        {item.simulated ? <Badge tone="amber">simulated</Badge> : null}
                      </div>
                      <div className="notification-meta">
                        <Badge tone={notificationTone(item.status)}>{statusLabel(item.status)}</Badge>
                        <span className="muted small">
                          {item.provider} · {timeAgo(item.queuedAt)}
                        </span>
                      </div>
                      {item.lastError ? (
                        <p className="error-text small">{item.lastError}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="drawer-section">
              <h3>
                <Icon name="contacts" size={16} /> Responder notes
              </h3>
              {incident.notes.length === 0 ? (
                <p className="muted">No notes yet.</p>
              ) : (
                <ul className="note-list">
                  {[...incident.notes].reverse().slice(0, 8).map((item, index) => (
                    <li key={`${item.at}-${index}`}>
                      <div className="note-head">
                        <Badge tone="slate">{item.byRole || 'RESPONDER'}</Badge>
                        <span className="muted small">{formatDateTime(item.at)}</span>
                      </div>
                      <p>{item.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="note-form">
                <label htmlFor="incident-note" className="sr-only">
                  Add a responder note
                </label>
                <textarea
                  id="incident-note"
                  value={note}
                  maxLength={1000}
                  rows={2}
                  placeholder="Add what you did, saw, or dispatched…"
                  onChange={(event) => setNote(event.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={noteBusy || note.trim().length === 0}
                  onClick={() => void submitNote()}
                >
                  {noteBusy ? <Spinner label="Saving note" /> : <Icon name="plus" size={15} />}
                  Add note
                </button>
              </div>
            </section>

            <section className="drawer-section">
              <h3>
                <Icon name="history" size={16} /> Timeline
              </h3>
              <ol className="timeline">
                {[...incident.statusHistory].reverse().map((event, index) => (
                  <li key={`${event.at}-${index}`}>
                    <span className={`timeline-dot tone-${statusTone(event.status)}`} />
                    <div>
                      <strong>{statusLabel(event.status)}</strong>
                      <span className="muted small">
                        {' '}
                        by {event.byRole.toLowerCase()} · {formatDateTime(event.at)}
                      </span>
                      {event.note ? <p className="small">{event.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

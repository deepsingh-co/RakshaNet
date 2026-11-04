import { useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { fetchIncidents } from '../lib/api';
import {
  elapsedSince,
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
  timeAgo,
  typeLabel,
} from '../lib/format';
import { useAsyncData, useReloadInterval } from '../lib/useAsyncData';
import { ACTIVE_INCIDENT_STATUSES, type IncidentStatus } from '../types';
import { IncidentDrawer } from '../components/IncidentDrawer';
import { Icon } from '../components/Icons';
import {
  Badge,
  EmptyBlock,
  ErrorBlock,
  KpiCard,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '../components/ui';

export function LiveIncidentsPage() {
  const { revision, connected } = useRealtime();
  const [selected, setSelected] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const state = useAsyncData(
    () => fetchIncidents({ active: true, limit: 100 }),
    [revision, tick],
  );
  const reload = () => setTick((value) => value + 1);
  useReloadInterval(reload, 20_000);

  const incidents = state.data?.incidents ?? [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return incidents.filter((incident) => {
      if (statusFilter !== 'ALL' && incident.status !== statusFilter) return false;
      if (!needle) return true;
      return [incident.owner?.fullName, incident.owner?.email, incident.id, incident.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [incidents, query, statusFilter]);

  const failed = incidents.filter((incident) => incident.status === 'DELIVERY_FAILED').length;
  const offline = incidents.filter((incident) => incident.offlineCreated).length;
  const escalated = incidents.filter((incident) => incident.escalationLevel > 0).length;

  return (
    <>
      <PageHeader
        eyebrow="Monitor"
        title="Live incidents"
        description="Active incidents that still need attention, newest first. Opening an incident shows verified delivery status and the location the device actually shared."
        actions={
          <>
            <span className={`live-chip ${connected ? 'is-online' : 'is-offline'}`}>
              <Icon name={connected ? 'wifi' : 'wifi-off'} size={15} />
              {connected ? 'Live updates on' : 'Reconnecting'}
            </span>
            <button type="button" className="btn btn-secondary" onClick={reload}>
              <Icon name="refresh" size={16} /> Refresh
            </button>
          </>
        }
      />

      <div className="kpi-grid kpi-grid-four">
        <KpiCard
          label="Active now"
          value={incidents.length}
          icon="siren"
          tone={incidents.length > 0 ? 'red' : 'green'}
          sub="Across your permitted scope"
        />
        <KpiCard
          label="Delivery failed"
          value={failed}
          icon="bell"
          tone={failed > 0 ? 'red' : 'slate'}
          sub="No verified contact could be alerted"
        />
        <KpiCard
          label="Offline-created"
          value={offline}
          icon="wifi-off"
          tone={offline > 0 ? 'amber' : 'slate'}
          sub="Server received them late — delay is recorded"
        />
        <KpiCard
          label="Escalated"
          value={escalated}
          icon="alert"
          tone={escalated > 0 ? 'orange' : 'slate'}
          sub="Escalation level above zero"
        />
      </div>

      <SectionCard
        title="Priority queue"
        subtitle={`${filtered.length} of ${incidents.length} active incidents shown`}
        actions={
          <div className="toolbar-inline">
            <div className="search-field">
              <Icon name="search" size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search person or incident…"
                aria-label="Search active incidents"
              />
            </div>
            <label className="select-inline">
              <span className="sr-only">Filter by status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="ALL">All active statuses</option>
                {ACTIVE_INCIDENT_STATUSES.map((status: IncidentStatus) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        {state.error && !state.data ? (
          <ErrorBlock error={state.error} onRetry={state.reload} />
        ) : null}
        {!state.data && state.loading ? (
          <LoadingBlock label="Loading live incidents…" />
        ) : null}

        {state.data && incidents.length === 0 ? (
          <EmptyBlock
            icon="shield"
            title="No active incidents"
            message="Nothing is waiting for a response in your scope. New incidents appear here instantly over the authenticated live connection."
          />
        ) : null}

        {state.data && incidents.length > 0 && filtered.length === 0 ? (
          <EmptyBlock
            icon="search"
            title="No matching incidents"
            message="No active incident matches the current search or status filter."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('ALL');
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : null}

        {filtered.length > 0 ? (
          <div className="incident-grid">
            {filtered.map((incident) => (
              <button
                type="button"
                key={incident.id}
                className={`incident-card tone-border-${severityTone(incident.severity)}`}
                onClick={() => setSelected(incident.id)}
              >
                <div className="incident-card-top">
                  <div className="incident-card-title">
                    <span className={`severity-dot tone-${severityTone(incident.severity)}`} />
                    <span>{typeLabel(incident.type)}</span>
                    <span className="muted small">#{incident.id.slice(-6)}</span>
                  </div>
                  <Badge tone={statusTone(incident.status)} dot>
                    {statusLabel(incident.status)}
                  </Badge>
                </div>

                <div className="incident-person">
                  <span className="avatar">{incident.owner?.fullName.charAt(0) ?? '?'}</span>
                  <div>
                    <strong>{incident.owner?.fullName ?? 'Unknown owner'}</strong>
                    <span className="muted small">
                      {incident.owner?.phoneMasked ?? 'No contact summary'}
                    </span>
                  </div>
                </div>

                <div className="incident-card-meta">
                  <span>
                    <Icon name="clock" size={14} /> {elapsedSince(incident.startedAt)}
                  </span>
                  <span>
                    <Icon name="location" size={14} />{' '}
                    {incident.location ? 'Location shared' : 'No GPS fix'}
                  </span>
                  <span className={`severity-text tone-${severityTone(incident.severity)}`}>
                    {severityLabel(incident.severity)}
                  </span>
                </div>

                <div className="incident-card-foot">
                  <span className="muted small">Started {timeAgo(incident.startedAt)}</span>
                  <div className="badge-row">
                    {incident.offlineCreated ? <Badge tone="amber">Offline</Badge> : null}
                    {incident.escalationLevel > 0 ? (
                      <Badge tone="orange">Level {incident.escalationLevel}</Badge>
                    ) : null}
                    <span className="text-link">
                      Open <Icon name="chevron-right" size={14} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <IncidentDrawer
        incidentId={selected}
        onClose={() => setSelected(null)}
        onChanged={reload}
      />
    </>
  );
}

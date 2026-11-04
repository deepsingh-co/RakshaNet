import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { fetchAnalyticsSummary, fetchIncidents } from '../lib/api';
import {
  daysAgo,
  elapsedSince,
  humanDuration,
  severityTone,
  statusLabel,
  statusTone,
  timeAgo,
  typeLabel,
} from '../lib/format';
import { useAsyncData, useReloadInterval } from '../lib/useAsyncData';
import type { IncidentStatus } from '../types';
import { DonutChart, TrendChart } from '../components/Charts';
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
  Spinner,
} from '../components/ui';

const RANGE_OPTIONS = [7, 30, 90];

export function OverviewPage() {
  const { user } = useAuth();
  const { revision, lastEvent, connected } = useRealtime();
  const [rangeDays, setRangeDays] = useState(30);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const summaryState = useAsyncData(
    () => fetchAnalyticsSummary({ from: daysAgo(rangeDays) }),
    [rangeDays, revision, tick],
  );

  const activeState = useAsyncData(
    () => fetchIncidents({ active: true, limit: 8 }),
    [revision, tick],
  );

  const reload = () => setTick((value) => value + 1);
  useReloadInterval(reload, 30_000);

  const summary = summaryState.data;
  const activeIncidents = activeState.data?.incidents ?? [];
  const isAdmin = user?.role === 'ADMIN';

  const statusData = summary
    ? Object.entries(summary.incidents.byStatus)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([status, count]) => ({
          label: statusLabel(status as IncidentStatus),
          value: count,
          tone: statusTone(status as IncidentStatus),
        }))
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Operations overview"
        title={`Safety overview${user ? `, ${user.fullName.split(' ')[0]}` : ''}`}
        description="Live incidents, response times, and delivery truth for your permitted scope. Every number here comes from the backend — nothing is generated for display."
        actions={
          <>
            <label className="select-inline">
              <span className="sr-only">Reporting range</span>
              <select
                value={rangeDays}
                onChange={(event) => setRangeDays(Number(event.target.value))}
              >
                {RANGE_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    Last {days} days
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={reload}
              disabled={summaryState.loading || activeState.loading}
            >
              {summaryState.loading || activeState.loading ? (
                <Spinner label="Refreshing" />
              ) : (
                <Icon name="refresh" size={16} />
              )}
              Refresh
            </button>
          </>
        }
      />

      {summaryState.error && !summary ? (
        <ErrorBlock error={summaryState.error} onRetry={summaryState.reload} />
      ) : null}

      {!summary && summaryState.loading ? <LoadingBlock label="Loading safety metrics…" /> : null}

      {summary ? (
        <>
          <div className="kpi-grid">
            <KpiCard
              label="Active incidents"
              value={summary.incidents.active}
              icon="siren"
              tone={summary.incidents.active > 0 ? 'red' : 'green'}
              sub={
                summary.incidents.active > 0
                  ? 'Still need attention'
                  : 'No open incidents in scope'
              }
            />
            <KpiCard
              label={`Incidents · ${rangeDays}d`}
              value={summary.incidents.total}
              icon="activity"
              tone="blue"
              sub={`${summary.incidents.resolvedInRange} resolved in this period`}
            />
            <KpiCard
              label="Avg acknowledgement"
              value={humanDuration(summary.incidents.avgAckSeconds)}
              icon="clock"
              tone="teal"
              sub={
                summary.incidents.avgAckSeconds === null
                  ? 'No acknowledgements in range'
                  : 'From trigger to acknowledgement'
              }
            />
            <KpiCard
              label="Avg resolution"
              value={humanDuration(summary.incidents.avgResolveSeconds)}
              icon="check"
              tone="green"
              sub={
                summary.incidents.avgResolveSeconds === null
                  ? 'No resolved incidents in range'
                  : 'From trigger to resolution'
              }
            />
            <KpiCard
              label="Delivery truth"
              value={`${summary.notifications.delivered} / ${summary.notifications.sent}`}
              icon="bell"
              tone={summary.notifications.failed > 0 ? 'orange' : 'teal'}
              sub={
                summary.notifications.simulated > 0
                  ? `${summary.notifications.simulated} simulated sends`
                  : `${summary.notifications.failed} failed · delivered / provider-accepted`
              }
            />
            <KpiCard
              label="Escalated"
              value={summary.incidents.escalated}
              icon="alert"
              tone={summary.incidents.escalated > 0 ? 'orange' : 'slate'}
              sub={`${summary.incidents.offline} offline-created in range`}
            />
          </div>

          <div className="overview-charts">
            <SectionCard
              title="Incident trend"
              subtitle={`Incidents recorded per day over the last ${rangeDays} days`}
              className="span-2"
              actions={
                <span className={`live-chip ${connected ? 'is-online' : 'is-offline'}`}>
                  <Icon name={connected ? 'wifi' : 'wifi-off'} size={14} />
                  {connected ? 'Live' : 'Offline'}
                </span>
              }
            >
              <TrendChart data={summary.incidents.byDay} tone="blue" />
            </SectionCard>

            <SectionCard title="Status mix" subtitle="All incidents in the selected range">
              <DonutChart data={statusData} centerLabel="incidents" />
            </SectionCard>
          </div>

          <div className="overview-lower">
            <SectionCard
              title="Priority queue"
              subtitle="Most recent active incidents in your scope"
              actions={
                <Link to="/incidents" className="text-link">
                  View all <Icon name="chevron-right" size={14} />
                </Link>
              }
            >
              {activeState.error && !activeState.data ? (
                <ErrorBlock error={activeState.error} onRetry={activeState.reload} />
              ) : null}
              {!activeState.data && activeState.loading ? (
                <LoadingBlock label="Loading active incidents…" />
              ) : null}
              {activeState.data && activeIncidents.length === 0 ? (
                <EmptyBlock
                  icon="shield"
                  title="No active incidents"
                  message="There are no incidents awaiting attention in your scope right now. This is the state we want."
                />
              ) : null}
              {activeIncidents.length > 0 ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Incident</th>
                        <th>Person</th>
                        <th>Status</th>
                        <th>Elapsed</th>
                        <th aria-label="Open" />
                      </tr>
                    </thead>
                    <tbody>
                      {activeIncidents.map((incident) => (
                        <tr key={incident.id}>
                          <td>
                            <div className="cell-stack">
                              <span className="cell-title">
                                <span
                                  className={`severity-dot tone-${severityTone(incident.severity)}`}
                                  aria-hidden="true"
                                />
                                {typeLabel(incident.type)}
                              </span>
                              <span className="muted small">
                                #{incident.id.slice(-6)} · {timeAgo(incident.startedAt)}
                              </span>
                            </div>
                          </td>
                          <td>{incident.owner?.fullName ?? 'Unknown owner'}</td>
                          <td>
                            <Badge tone={statusTone(incident.status)} dot>
                              {statusLabel(incident.status)}
                            </Badge>
                          </td>
                          <td className="mono-cell">{elapsedSince(incident.startedAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-ghost btn-small"
                              onClick={() => setSelectedIncident(incident.id)}
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </SectionCard>

            <div className="stack">
              <SectionCard title="Response network">
                <ul className="stat-list">
                  {isAdmin && summary.users ? (
                    <>
                      <li>
                        <span>Registered users</span>
                        <strong>{summary.users.total}</strong>
                      </li>
                      <li>
                        <span>Active users</span>
                        <strong>{summary.users.active}</strong>
                      </li>
                      <li>
                        <span>Guardians</span>
                        <strong>{summary.users.guardians}</strong>
                      </li>
                      <li>
                        <span>Verified guardian links</span>
                        <strong>{summary.users.verifiedGuardianLinks}</strong>
                      </li>
                      <li>
                        <span>Suspended accounts</span>
                        <strong>{summary.users.suspended}</strong>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <span>Linked children</span>
                        <strong>{summary.linkedChildren ?? 0}</strong>
                      </li>
                      <li>
                        <span>Your incidents in range</span>
                        <strong>{summary.incidents.total}</strong>
                      </li>
                      <li>
                        <span>Your active incidents</span>
                        <strong>{summary.incidents.active}</strong>
                      </li>
                    </>
                  )}
                </ul>
                <Link to={isAdmin ? '/users' : '/guardians'} className="text-link mt-12">
                  {isAdmin ? 'Manage users' : 'Manage guardian links'}{' '}
                  <Icon name="chevron-right" size={14} />
                </Link>
              </SectionCard>

              <SectionCard title="Live activity">
                {lastEvent ? (
                  <div className="live-event">
                    <span className="event-pulse" aria-hidden="true" />
                    <div>
                      <strong>{lastEvent.event.replace(/[:_]/g, ' ')}</strong>
                      <span className="muted small"> {timeAgo(lastEvent.at)}</span>
                      <p className="muted small">
                        The affected views refresh automatically. A 30-second fallback sync also
                        runs in the background.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="muted">
                    {connected
                      ? 'Connected. Waiting for the next realtime event.'
                      : 'Realtime link is reconnecting. Data still refreshes every 30 seconds.'}
                  </p>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      ) : null}

      <IncidentDrawer
        incidentId={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onChanged={reload}
      />
    </>
  );
}

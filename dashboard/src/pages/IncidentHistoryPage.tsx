import { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import { downloadIncidentCsv, fetchIncidents } from '../lib/api';
import {
  daysAgo,
  formatDateTime,
  formatDateInput,
  humanDuration,
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
  timeAgo,
  typeLabel,
} from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import {
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  type IncidentStatus,
  type IncidentType,
} from '../types';
import { IncidentDrawer } from '../components/IncidentDrawer';
import { Icon } from '../components/Icons';
import {
  Badge,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Pagination,
  SectionCard,
  Spinner,
} from '../components/ui';

const PAGE_SIZE = 20;

function startOfDay(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function endOfDay(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function IncidentHistoryPage() {
  const { revision } = useRealtime();
  const { toast } = useToast();
  const [status, setStatus] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(formatDateInput(new Date()));
  const [scope, setScope] = useState<'CLOSED' | 'ALL'>('CLOSED');
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [exporting, setExporting] = useState(false);

  const state = useAsyncData(
    () =>
      fetchIncidents({
        status: status === 'ALL' ? undefined : status,
        type: type === 'ALL' ? undefined : type,
        active: status === 'ALL' && scope === 'CLOSED' ? false : undefined,
        offlineOnly: offlineOnly || undefined,
        from: startOfDay(from),
        to: endOfDay(to),
        page,
        limit: PAGE_SIZE,
      }),
    [status, type, from, to, scope, offlineOnly, page, revision, tick],
  );

  const incidents = state.data?.incidents ?? [];
  const pagination = state.data?.pagination;

  const setFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const quickRange = (days: number) => {
    setFrom(daysAgo(days));
    setTo(formatDateInput(new Date()));
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await downloadIncidentCsv({
        status: status === 'ALL' ? undefined : status,
        type: type === 'ALL' ? undefined : type,
        from: startOfDay(from),
        to: endOfDay(to),
      });
      toast(
        `CSV exported: ${result.rows} incident${result.rows === 1 ? '' : 's'}${
          result.truncated ? ` (limited; ${result.total} matched)` : ''
        }.`,
        result.truncated ? 'info' : 'success',
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'CSV export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Monitor"
        title="Incident history"
        description="Closed and cancelled incidents by default, with the recorded offline gap, response timestamps, and delivery outcome. Filters are applied on the server."
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void exportCsv()}
              disabled={exporting}
            >
              {exporting ? <Spinner label="Exporting" /> : <Icon name="download" size={16} />}
              Export CSV
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setTick((v) => v + 1)}>
              <Icon name="refresh" size={16} /> Refresh
            </button>
          </>
        }
      />

      <SectionCard title="Filters" subtitle="Server-side filters for this view">
        <div className="filter-grid">
          <div className="field">
            <label htmlFor="history-status">Status</label>
            <select
              id="history-status"
              value={status}
              onChange={(event) => setFilter(() => setStatus(event.target.value))}
            >
              <option value="ALL">All statuses</option>
              {INCIDENT_STATUSES.map((value: IncidentStatus) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="history-type">Incident type</label>
            <select
              id="history-type"
              value={type}
              onChange={(event) => setFilter(() => setType(event.target.value))}
            >
              <option value="ALL">All types</option>
              {INCIDENT_TYPES.map((value: IncidentType) => (
                <option key={value} value={value}>
                  {typeLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="history-scope">Scope</label>
            <select
              id="history-scope"
              value={scope}
              onChange={(event) => setFilter(() => setScope(event.target.value as 'CLOSED' | 'ALL'))}
              disabled={status !== 'ALL'}
            >
              <option value="CLOSED">Closed only</option>
              <option value="ALL">All incidents</option>
            </select>
            {status !== 'ALL' ? (
              <p className="field-hint">A status filter overrides the scope.</p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="history-from">From</label>
            <input
              id="history-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFilter(() => setFrom(event.target.value))}
            />
          </div>

          <div className="field">
            <label htmlFor="history-to">To</label>
            <input
              id="history-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setFilter(() => setTo(event.target.value))}
            />
          </div>

          <div className="field">
            <span className="field-label">Quick range</span>
            <div className="button-row">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => quickRange(days)}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={offlineOnly}
            onChange={(event) => setFilter(() => setOfflineOnly(event.target.checked))}
          />
          <span>
            Offline-created only
            <span className="muted small">
              {' '}
              — shows incidents whose original device time is preserved and whose server delay is
              recorded.
            </span>
          </span>
        </label>
      </SectionCard>

      <SectionCard
        title="Incident records"
        subtitle={
          pagination
            ? `${pagination.total} record${pagination.total === 1 ? '' : 's'} match the filters`
            : 'Loading records…'
        }
      >
        {state.error && !state.data ? (
          <ErrorBlock error={state.error} onRetry={state.reload} />
        ) : null}
        {!state.data && state.loading ? (
          <LoadingBlock label="Loading incident history…" />
        ) : null}

        {state.data && incidents.length === 0 ? (
          <EmptyBlock
            icon="history"
            title="No incidents match"
            message="No incident in the selected range and filters. Widen the date range or clear a filter to check again."
          />
        ) : null}

        {incidents.length > 0 ? (
          <div className={`table-wrap ${state.loading ? 'is-refreshing' : ''}`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Person</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Offline delay</th>
                  <th>Resolved</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td>
                      <div className="cell-stack">
                        <span>{formatDateTime(incident.startedAt)}</span>
                        <span className="muted small">{timeAgo(incident.startedAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span>{incident.owner?.fullName ?? 'Unknown owner'}</span>
                        <span className="muted small">
                          {incident.owner?.phoneMasked ?? incident.owner?.email ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td>{typeLabel(incident.type)}</td>
                    <td>
                      <Badge tone={severityTone(incident.severity)}>
                        {severityLabel(incident.severity)}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={statusTone(incident.status)} dot>
                        {statusLabel(incident.status)}
                      </Badge>
                    </td>
                    <td>
                      {incident.offlineCreated ? (
                        <span className="warn-text">
                          {humanDuration(incident.offlineDelaySeconds)}
                        </span>
                      ) : (
                        <span className="muted">None</span>
                      )}
                    </td>
                    <td>
                      {incident.resolvedAt ? (
                        <div className="cell-stack">
                          <span>{formatDateTime(incident.resolvedAt)}</span>
                          <span className="muted small">
                            {humanDuration(
                              (new Date(incident.resolvedAt).getTime() -
                                new Date(incident.startedAt).getTime()) /
                                1000,
                            )}{' '}
                            after start
                          </span>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => setSelected(incident.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {pagination ? (
          <Pagination
            page={pagination.page}
            pages={Math.max(1, pagination.pages)}
            total={pagination.total}
            limit={pagination.limit}
            onPage={setPage}
            noun="incidents"
          />
        ) : null}
        <p className="muted small mt-12">
          CSV export applies the current status, type, and date range. The export is capped at
          5,000 rows and every export is written to the audit log.
        </p>
      </SectionCard>

      <IncidentDrawer
        incidentId={selected}
        onClose={() => setSelected(null)}
        onChanged={() => setTick((value) => value + 1)}
      />
    </>
  );
}

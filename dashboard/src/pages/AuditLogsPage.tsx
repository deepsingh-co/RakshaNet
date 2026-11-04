import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAuditActions, fetchAuditLogs } from '../lib/api';
import {
  daysAgo,
  formatDateInput,
  formatDateTime,
  timeAgo,
  titleCase,
} from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import type { AuditLog } from '../types';
import { Icon } from '../components/Icons';
import {
  AccessDenied,
  Badge,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  SectionCard,
} from '../components/ui';

const PAGE_SIZE = 50;

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

export function AuditLogsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [action, setAction] = useState('ALL');
  const [outcome, setOutcome] = useState('ALL');
  const [actorRole, setActorRole] = useState('ALL');
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(formatDateInput(new Date()));
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const actionsState = useAsyncData(() => fetchAuditActions(), [], isAdmin);
  const logsState = useAsyncData(
    () =>
      fetchAuditLogs({
        action: action === 'ALL' ? undefined : action,
        outcome: outcome === 'ALL' ? undefined : outcome,
        actorRole: actorRole === 'ALL' ? undefined : actorRole,
        from: startOfDay(from),
        to: endOfDay(to),
        page,
        limit: PAGE_SIZE,
      }),
    [action, outcome, actorRole, from, to, page, tick],
    isAdmin,
  );

  const logs = logsState.data?.logs ?? [];
  const pagination = logsState.data?.pagination;
  const actions = actionsState.data?.actions ?? [];

  const setFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Audit logs"
        description="Append-only security and operational history. There is no create, edit, or delete endpoint — records are written only by trusted backend code."
        actions={
          isAdmin ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTick((value) => value + 1)}
            >
              <Icon name="refresh" size={16} /> Refresh
            </button>
          ) : undefined
        }
      />

      {!isAdmin ? <AccessDenied module="Audit logs" /> : null}

      {isAdmin ? (
        <>
          <SectionCard title="Filters" subtitle="Admin reads of this log are themselves audited">
            <div className="filter-grid">
              <div className="field">
                <label htmlFor="audit-action">Action</label>
                <select
                  id="audit-action"
                  value={action}
                  onChange={(event) => setFilter(() => setAction(event.target.value))}
                >
                  <option value="ALL">All actions</option>
                  {actions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="audit-outcome">Outcome</label>
                <select
                  id="audit-outcome"
                  value={outcome}
                  onChange={(event) => setFilter(() => setOutcome(event.target.value))}
                >
                  <option value="ALL">All outcomes</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILURE">Failure</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="audit-role">Actor role</label>
                <select
                  id="audit-role"
                  value={actorRole}
                  onChange={(event) => setFilter(() => setActorRole(event.target.value))}
                >
                  <option value="ALL">All roles</option>
                  <option value="USER">User</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SYSTEM">System</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="audit-from">From</label>
                <input
                  id="audit-from"
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => setFilter(() => setFrom(event.target.value))}
                />
              </div>
              <div className="field">
                <label htmlFor="audit-to">To</label>
                <input
                  id="audit-to"
                  type="date"
                  value={to}
                  min={from}
                  onChange={(event) => setFilter(() => setTo(event.target.value))}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Audit records"
            subtitle={
              pagination
                ? `${pagination.total} record${pagination.total === 1 ? '' : 's'} match`
                : 'Loading records…'
            }
          >
            {logsState.error && !logsState.data ? (
              <ErrorBlock error={logsState.error} onRetry={logsState.reload} />
            ) : null}
            {!logsState.data && logsState.loading ? (
              <LoadingBlock label="Loading audit records…" />
            ) : null}
            {logsState.data && logs.length === 0 ? (
              <EmptyBlock
                icon="audit"
                title="No audit records"
                message="No entries match the selected filters and date range."
              />
            ) : null}

            {logs.length > 0 ? (
              <div className={`table-wrap ${logsState.loading ? 'is-refreshing' : ''}`}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Resource</th>
                      <th>Outcome</th>
                      <th>Detail</th>
                      <th aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div className="cell-stack">
                            <span>{formatDateTime(log.createdAt)}</span>
                            <span className="muted small">{timeAgo(log.createdAt)}</span>
                          </div>
                        </td>
                        <td className="mono-cell">{log.action}</td>
                        <td>
                          <div className="cell-stack">
                            <span>{log.actorRole || 'SYSTEM'}</span>
                            <span className="muted small mono-cell">
                              {log.actorId ? log.actorId.slice(-8) : '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <span>{log.resourceType}</span>
                            <span className="muted small mono-cell">
                              {log.resourceId ? log.resourceId.slice(-8) : '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Badge tone={log.outcome === 'SUCCESS' ? 'green' : 'red'} dot>
                            {titleCase(log.outcome)}
                          </Badge>
                        </td>
                        <td className="detail-cell">{log.detail || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost btn-small"
                            onClick={() => setDetail(log)}
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
                noun="audit records"
              />
            ) : null}
          </SectionCard>
        </>
      ) : null}

      <Modal
        open={detail !== null}
        title="Audit record"
        description="Immutable entry written by the backend audit service."
        onClose={() => setDetail(null)}
        size="lg"
      >
        {detail ? (
          <dl className="audit-detail">
            <div>
              <dt>Time</dt>
              <dd>{formatDateTime(detail.createdAt)}</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd className="mono-cell">{detail.action}</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>
                <Badge tone={detail.outcome === 'SUCCESS' ? 'green' : 'red'}>
                  {detail.outcome}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Actor role</dt>
              <dd>{detail.actorRole || 'SYSTEM'}</dd>
            </div>
            <div>
              <dt>Actor ID</dt>
              <dd className="mono-cell">{detail.actorId ?? '—'}</dd>
            </div>
            <div>
              <dt>Resource type</dt>
              <dd>{detail.resourceType}</dd>
            </div>
            <div>
              <dt>Resource ID</dt>
              <dd className="mono-cell">{detail.resourceId ?? '—'}</dd>
            </div>
            <div className="span-2">
              <dt>Detail</dt>
              <dd>{detail.detail || '—'}</dd>
            </div>
            <div>
              <dt>IP address</dt>
              <dd className="mono-cell">{detail.ip || '—'}</dd>
            </div>
            <div className="span-2">
              <dt>User agent</dt>
              <dd className="break-all">{detail.userAgent || '—'}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>
    </>
  );
}

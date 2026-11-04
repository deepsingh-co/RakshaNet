import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { downloadIncidentCsv, fetchAnalyticsSummary } from '../lib/api';
import {
  daysAgo,
  formatDateInput,
  humanDuration,
  percent,
  statusLabel,
  statusTone,
  typeLabel,
} from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import type { IncidentStatus } from '../types';
import { BarList, DeliveryBar, DonutChart, TrendChart } from '../components/Charts';
import { Icon } from '../components/Icons';
import {
  Badge,
  ErrorBlock,
  KpiCard,
  LoadingBlock,
  PageHeader,
  SectionCard,
  Spinner,
} from '../components/ui';

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

export function AnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(formatDateInput(new Date()));
  const [tick, setTick] = useState(0);
  const [exporting, setExporting] = useState(false);

  const state = useAsyncData(
    () => fetchAnalyticsSummary({ from: startOfDay(from), to: endOfDay(to) }),
    [from, to, tick],
  );
  const summary = state.data;
  const isAdmin = user?.role === 'ADMIN';

  const setRange = (days: number) => {
    setFrom(daysAgo(days));
    setTo(formatDateInput(new Date()));
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await downloadIncidentCsv({
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

  const typeData = summary
    ? Object.entries(summary.incidents.byType)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => ({
          label: typeLabel(type as never),
          value: count,
          tone: 'blue',
        }))
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Analytics & reports"
        description="Role-scoped metrics computed from real incident and notification records. Averages are omitted when no sample exists instead of being shown as zero."
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

      <SectionCard title="Report range" subtitle="All metrics and exports use this period">
        <div className="range-row">
          <div className="button-row">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setRange(days)}
              >
                Last {days} days
              </button>
            ))}
          </div>
          <div className="range-inputs">
            <div className="field">
              <label htmlFor="analytics-from">From</label>
              <input
                id="analytics-from"
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="analytics-to">To</label>
              <input
                id="analytics-to"
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </div>
          {summary ? (
            <div className="range-meta">
              <Badge tone="slate">
                Scope: {summary.viewerRole === 'ADMIN' ? 'all accounts' : 'your network'}
              </Badge>
              <span className="muted small">Generated {new Date(summary.generatedAt).toLocaleTimeString()}</span>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {state.error && !summary ? <ErrorBlock error={state.error} onRetry={state.reload} /> : null}
      {!summary && state.loading ? <LoadingBlock label="Computing safety metrics…" /> : null}

      {summary ? (
        <>
          <div className="kpi-grid">
            <KpiCard
              label="Incidents"
              value={summary.incidents.total}
              icon="activity"
              tone="blue"
              sub={`${summary.incidents.active} still active`}
            />
            <KpiCard
              label="Resolved in range"
              value={summary.incidents.resolvedInRange}
              icon="check"
              tone="green"
              sub={`${percent(
                summary.incidents.resolvedInRange,
                Math.max(1, summary.incidents.total),
              )}% of incidents in range`}
            />
            <KpiCard
              label="Avg acknowledgement"
              value={humanDuration(summary.incidents.avgAckSeconds)}
              icon="clock"
              tone="teal"
              sub={
                summary.incidents.avgAckSeconds === null
                  ? 'No acknowledged incidents in range'
                  : 'Trigger to acknowledgement'
              }
            />
            <KpiCard
              label="Avg resolution"
              value={humanDuration(summary.incidents.avgResolveSeconds)}
              icon="shield"
              tone="green"
              sub={
                summary.incidents.avgResolveSeconds === null
                  ? 'No resolved incidents in range'
                  : 'Trigger to resolution'
              }
            />
            <KpiCard
              label="Offline-created"
              value={summary.incidents.offline}
              icon="wifi-off"
              tone={summary.incidents.offline > 0 ? 'amber' : 'slate'}
              sub="Device time preserved; server delay recorded"
            />
            <KpiCard
              label="Escalated"
              value={summary.incidents.escalated}
              icon="alert"
              tone={summary.incidents.escalated > 0 ? 'orange' : 'slate'}
              sub="Escalation level above zero"
            />
          </div>

          <div className="overview-charts">
            <SectionCard
              title="Daily incident volume"
              subtitle={`${summary.incidents.total} incidents between ${from} and ${to}`}
              className="span-2"
            >
              <TrendChart data={summary.incidents.byDay} tone="blue" />
            </SectionCard>
            <SectionCard title="Status distribution" subtitle="All incidents in range">
              <DonutChart data={statusData} centerLabel="incidents" />
            </SectionCard>
          </div>

          <div className="analytics-lower">
            <SectionCard title="Incident types" subtitle="What triggered the alerts">
              <BarList data={typeData} tone="blue" />
            </SectionCard>

            <SectionCard
              title="Notification delivery"
              subtitle="Provider-accepted vs webhook-confirmed delivery"
            >
              <DeliveryBar
                delivered={summary.notifications.delivered}
                sent={summary.notifications.sent}
                queued={summary.notifications.queued}
                failed={summary.notifications.failed}
                simulated={summary.notifications.simulated}
              />
            </SectionCard>

            <SectionCard title="Response quality" subtitle="Measured only where a sample exists">
              <ul className="stat-list">
                <li>
                  <span>Acknowledged incidents</span>
                  <strong>
                    {summary.incidents.avgAckSeconds === null
                      ? 'No sample'
                      : humanDuration(summary.incidents.avgAckSeconds)}
                  </strong>
                </li>
                <li>
                  <span>Resolved incidents</span>
                  <strong>
                    {summary.incidents.avgResolveSeconds === null
                      ? 'No sample'
                      : humanDuration(summary.incidents.avgResolveSeconds)}
                  </strong>
                </li>
                <li>
                  <span>Delivery success (of accepted)</span>
                  <strong>
                    {percent(
                      summary.notifications.delivered,
                      Math.max(1, summary.notifications.delivered + summary.notifications.sent),
                    )}
                    %
                  </strong>
                </li>
                <li>
                  <span>Failed notifications</span>
                  <strong>{summary.notifications.failed}</strong>
                </li>
                <li>
                  <span>Console simulations</span>
                  <strong>{summary.notifications.simulated}</strong>
                </li>
              </ul>
            </SectionCard>
          </div>

          {isAdmin && summary.users ? (
            <SectionCard
              title="Network & accounts"
              subtitle="Administrator-only aggregates"
            >
              <div className="stat-grid">
                <div>
                  <span>Total accounts</span>
                  <strong>{summary.users.total}</strong>
                </div>
                <div>
                  <span>Active accounts</span>
                  <strong>{summary.users.active}</strong>
                </div>
                <div>
                  <span>Guardians</span>
                  <strong>{summary.users.guardians}</strong>
                </div>
                <div>
                  <span>Verified guardian links</span>
                  <strong>{summary.users.verifiedGuardianLinks}</strong>
                </div>
                <div>
                  <span>Suspended</span>
                  <strong>{summary.users.suspended}</strong>
                </div>
                <div>
                  <span>Audit events in range</span>
                  <strong>{summary.auditEvents ?? 0}</strong>
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Your network" subtitle="Guardian-linked accounts in your scope">
              <div className="stat-grid">
                <div>
                  <span>Linked children</span>
                  <strong>{summary.linkedChildren ?? 0}</strong>
                </div>
                <div>
                  <span>Your incidents in range</span>
                  <strong>{summary.incidents.total}</strong>
                </div>
                <div>
                  <span>Active now</span>
                  <strong>{summary.incidents.active}</strong>
                </div>
              </div>
            </SectionCard>
          )}

          <p className="muted small">
            CSV exports include only incidents you are permitted to read, are capped at 5,000
            rows, and are written to the audit log as <span className="mono-cell">ANALYTICS_EXPORTED</span>.
          </p>
        </>
      ) : null}
    </>
  );
}

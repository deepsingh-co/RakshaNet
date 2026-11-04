import { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { fetchNotifications } from '../lib/api';
import {
  daysAgo,
  formatDateInput,
  formatDateTime,
  notificationTone,
  statusLabel,
  timeAgo,
} from '../lib/format';
import { useAsyncData, useReloadInterval } from '../lib/useAsyncData';
import { NOTIFICATION_STATUSES, type NotificationStatus } from '../types';
import { IncidentDrawer } from '../components/IncidentDrawer';
import { DeliveryBar } from '../components/Charts';
import { Icon } from '../components/Icons';
import {
  Badge,
  EmptyBlock,
  ErrorBlock,
  InlineNotice,
  KpiCard,
  LoadingBlock,
  PageHeader,
  Pagination,
  SectionCard,
} from '../components/ui';

const PAGE_SIZE = 30;

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

export function NotificationsPage() {
  const { revision } = useRealtime();
  const [status, setStatus] = useState('ALL');
  const [channel, setChannel] = useState('ALL');
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(formatDateInput(new Date()));
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [incidentId, setIncidentId] = useState<string | null>(null);

  const state = useAsyncData(
    () =>
      fetchNotifications({
        status: status === 'ALL' ? undefined : status,
        channel: channel === 'ALL' ? undefined : channel,
        from: startOfDay(from),
        to: endOfDay(to),
        page,
        limit: PAGE_SIZE,
      }),
    [status, channel, from, to, page, revision, tick],
  );
  const reload = () => setTick((value) => value + 1);
  useReloadInterval(reload, 30_000);

  const notifications = state.data?.notifications ?? [];
  const summary = state.data?.summary;
  const pagination = state.data?.pagination;

  const setFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Notifications"
        description="Per-recipient delivery monitoring across SMS, WhatsApp, and push. Destination numbers are always masked. This feed reflects what the provider actually accepted."
        actions={
          <button type="button" className="btn btn-secondary" onClick={reload}>
            <Icon name="refresh" size={16} /> Refresh
          </button>
        }
      />

      <InlineNotice>
        <strong>SENT</strong> means the provider accepted the message. <strong>DELIVERED</strong>{' '}
        requires a verified provider webhook. <strong>simulated</strong> rows came from console
        mode and were never sent to a real phone.
      </InlineNotice>

      {summary ? (
        <div className="kpi-grid kpi-grid-five">
          <KpiCard label="Queued" value={summary.queued} icon="clock" tone="blue" />
          <KpiCard
            label="Sent (accepted)"
            value={summary.sent}
            icon="mail"
            tone="teal"
            sub="Provider accepted, not proof of delivery"
          />
          <KpiCard
            label="Delivered"
            value={summary.delivered}
            icon="check"
            tone="green"
            sub="Webhook-confirmed"
          />
          <KpiCard
            label="Failed"
            value={summary.failed}
            icon="alert"
            tone={summary.failed > 0 ? 'red' : 'slate'}
          />
          <KpiCard
            label="Simulated"
            value={summary.simulated}
            icon="eye"
            tone={summary.simulated > 0 ? 'amber' : 'slate'}
            sub="Console mode — no real send"
          />
        </div>
      ) : null}

      {summary ? (
        <SectionCard title="Delivery breakdown" subtitle="All notifications matching the filters">
          <DeliveryBar
            delivered={summary.delivered}
            sent={summary.sent}
            queued={summary.queued}
            failed={summary.failed}
            simulated={summary.simulated}
          />
        </SectionCard>
      ) : null}

      <SectionCard title="Delivery feed" subtitle="Newest queued first">
        <div className="filter-grid notifications-filter">
          <div className="field">
            <label htmlFor="notif-status">Status</label>
            <select
              id="notif-status"
              value={status}
              onChange={(event) => setFilter(() => setStatus(event.target.value))}
            >
              <option value="ALL">All statuses</option>
              {NOTIFICATION_STATUSES.map((value: NotificationStatus) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="notif-channel">Channel</label>
            <select
              id="notif-channel"
              value={channel}
              onChange={(event) => setFilter(() => setChannel(event.target.value))}
            >
              <option value="ALL">All channels</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="PUSH">Push</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="notif-from">From</label>
            <input
              id="notif-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFilter(() => setFrom(event.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="notif-to">To</label>
            <input
              id="notif-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setFilter(() => setTo(event.target.value))}
            />
          </div>
        </div>

        {state.error && !state.data ? (
          <ErrorBlock error={state.error} onRetry={state.reload} />
        ) : null}
        {!state.data && state.loading ? (
          <LoadingBlock label="Loading delivery records…" />
        ) : null}
        {state.data && notifications.length === 0 ? (
          <EmptyBlock
            icon="bell"
            title="No notification records"
            message="No alerts have been dispatched under these filters. If an incident ended in DELIVERY_FAILED, that means no verified contact existed — not that a message is still pending."
          />
        ) : null}

        {notifications.length > 0 ? (
          <div className={`table-wrap ${state.loading ? 'is-refreshing' : ''}`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Queued</th>
                  <th>Recipient</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Sent</th>
                  <th>Delivered</th>
                  <th>Incident</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => (
                  <tr key={notification.id}>
                    <td>
                      <div className="cell-stack">
                        <span>{formatDateTime(notification.queuedAt)}</span>
                        <span className="muted small">{timeAgo(notification.queuedAt)}</span>
                      </div>
                    </td>
                    <td className="mono-cell">{notification.destinationMasked}</td>
                    <td>{notification.channel}</td>
                    <td>
                      <div className="badge-row">
                        <Badge tone={notificationTone(notification.status)} dot>
                          {statusLabel(notification.status)}
                        </Badge>
                        {notification.simulated ? <Badge tone="amber">simulated</Badge> : null}
                      </div>
                      {notification.lastError ? (
                        <p className="error-text small">{notification.lastError}</p>
                      ) : null}
                    </td>
                    <td>{notification.provider}</td>
                    <td>{notification.sentAt ? formatDateTime(notification.sentAt) : '—'}</td>
                    <td>
                      {notification.deliveredAt ? formatDateTime(notification.deliveredAt) : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => setIncidentId(notification.incidentId)}
                      >
                        #{notification.incidentId.slice(-6)}
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
            noun="notifications"
          />
        ) : null}
      </SectionCard>

      <IncidentDrawer
        incidentId={incidentId}
        onClose={() => setIncidentId(null)}
        onChanged={reload}
      />
    </>
  );
}

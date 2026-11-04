import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchAnalyticsSummary, fetchUsers, setUserStatus } from '../lib/api';
import { formatDateTime, timeAgo } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import type { PublicUser } from '../types';
import { Icon } from '../components/Icons';
import {
  AccessDenied,
  Badge,
  EmptyBlock,
  ErrorBlock,
  KpiCard,
  LoadingBlock,
  PageHeader,
  Pagination,
  RoleBadge,
  SectionCard,
  Spinner,
} from '../components/ui';

const PAGE_SIZE = 20;

export function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const usersState = useAsyncData(
    () =>
      fetchUsers({
        q: query || undefined,
        role: role === 'ALL' ? undefined : role,
        status: status === 'ALL' ? undefined : status,
        page,
        limit: PAGE_SIZE,
      }),
    [query, role, status, page, tick],
    isAdmin,
  );

  const summaryState = useAsyncData(() => fetchAnalyticsSummary(), [tick], isAdmin);

  const users = usersState.data?.users ?? [];
  const pagination = usersState.data?.pagination;
  const summary = summaryState.data;

  const applyFilters = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    applyFilters(() => setQuery(searchInput.trim()));
  };

  const changeStatus = async (target: PublicUser) => {
    const next = target.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const verb = next === 'SUSPENDED' ? 'suspend' : 'reactivate';
    if (
      !window.confirm(
        next === 'SUSPENDED'
          ? `Suspend ${target.fullName}? All their refresh sessions will be revoked immediately.`
          : `Reactivate ${target.fullName}? They will be able to sign in again.`,
      )
    ) {
      return;
    }
    setBusyId(target.id);
    try {
      await setUserStatus(target.id, next);
      toast(`${target.fullName} ${verb}d.`, 'success');
      setTick((value) => value + 1);
    } catch (error) {
      toast(error instanceof Error ? error.message : `Could not ${verb} account`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Users & roles"
        description="Every account, its explicit role, and its access state. Guardians do not inherit administrator permissions; ADMIN is granted only by provisioning."
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

      {!isAdmin ? <AccessDenied module="Users & roles" /> : null}

      {isAdmin ? (
        <>
          {summary ? (
            <div className="kpi-grid kpi-grid-four">
              <KpiCard
                label="Total accounts"
                value={summary.users?.total ?? 0}
                icon="users"
                tone="blue"
              />
              <KpiCard
                label="Active accounts"
                value={summary.users?.active ?? 0}
                icon="check"
                tone="green"
              />
              <KpiCard
                label="Guardians"
                value={summary.users?.guardians ?? 0}
                icon="family"
                tone="teal"
                sub={`${summary.users?.verifiedGuardianLinks ?? 0} verified links`}
              />
              <KpiCard
                label="Suspended"
                value={summary.users?.suspended ?? 0}
                icon="lock"
                tone={(summary.users?.suspended ?? 0) > 0 ? 'orange' : 'slate'}
              />
            </div>
          ) : null}

          <SectionCard title="Accounts" subtitle="Search and filter is executed by the backend">
            <form className="filter-grid users-filter" onSubmit={submitSearch}>
              <div className="field field-grow">
                <label htmlFor="user-search">Search</label>
                <div className="search-field">
                  <Icon name="search" size={16} />
                  <input
                    id="user-search"
                    type="search"
                    placeholder="Name, email, or phone…"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="user-role">Role</label>
                <select
                  id="user-role"
                  value={role}
                  onChange={(event) => applyFilters(() => setRole(event.target.value))}
                >
                  <option value="ALL">All roles</option>
                  <option value="USER">User</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="user-status">Status</label>
                <select
                  id="user-status"
                  value={status}
                  onChange={(event) => applyFilters(() => setStatus(event.target.value))}
                >
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="DELETION_REQUESTED">Deletion requested</option>
                </select>
              </div>
              <div className="field field-actions">
                <button type="submit" className="btn btn-primary">
                  Search
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSearchInput('');
                    applyFilters(() => {
                      setQuery('');
                      setRole('ALL');
                      setStatus('ALL');
                    });
                  }}
                >
                  Clear
                </button>
              </div>
            </form>

            {usersState.error && !usersState.data ? (
              <ErrorBlock error={usersState.error} onRetry={usersState.reload} />
            ) : null}
            {!usersState.data && usersState.loading ? (
              <LoadingBlock label="Loading accounts…" />
            ) : null}
            {usersState.data && users.length === 0 ? (
              <EmptyBlock
                icon="users"
                title="No accounts match"
                message="Try a different search term or clear the role and status filters."
              />
            ) : null}

            {users.length > 0 ? (
              <div className={`table-wrap ${usersState.loading ? 'is-refreshing' : ''}`}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Contact</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Last login</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <div className="cell-stack">
                            <span className="cell-title">{account.fullName}</span>
                            <span className="muted small">{account.accountType}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <span>{account.email}</span>
                            <span className="muted small">{account.phone}</span>
                          </div>
                        </td>
                        <td>
                          <RoleBadge role={account.role} />
                        </td>
                        <td>
                          <Badge
                            tone={
                              account.status === 'ACTIVE'
                                ? 'green'
                                : account.status === 'SUSPENDED'
                                  ? 'red'
                                  : 'amber'
                            }
                            dot
                          >
                            {account.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td>{formatDateTime(account.createdAt)}</td>
                        <td>
                          {account.lastLoginAt ? (
                            <span title={formatDateTime(account.lastLoginAt)}>
                              {timeAgo(account.lastLoginAt)}
                            </span>
                          ) : (
                            <span className="muted">Never</span>
                          )}
                        </td>
                        <td>
                          {account.role !== 'ADMIN' && account.id !== user?.id ? (
                            <button
                              type="button"
                              className={`btn btn-small ${
                                account.status === 'SUSPENDED' ? 'btn-success' : 'btn-danger-ghost'
                              }`}
                              disabled={busyId === account.id}
                              onClick={() => void changeStatus(account)}
                            >
                              {busyId === account.id ? (
                                <Spinner label="Saving" />
                              ) : null}
                              {account.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                            </button>
                          ) : (
                            <span className="muted small">Protected</span>
                          )}
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
                noun="accounts"
              />
            ) : null}

            <p className="muted small mt-12">
              Suspending an account revokes all refresh sessions and is recorded in the audit log.
              Administrator accounts cannot be modified from this table.
            </p>
          </SectionCard>
        </>
      ) : null}
    </>
  );
}

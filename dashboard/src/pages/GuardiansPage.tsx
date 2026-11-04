import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  acceptGuardianLink,
  createChildAccount,
  fetchAllGuardianLinks,
  fetchGuardianLinks,
  inviteChild,
  revokeGuardianLink,
} from '../lib/api';
import { formatDateTime, maskPhone, timeAgo, titleCase } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import type { GuardianLink } from '../types';
import { Icon } from '../components/Icons';
import {
  Badge,
  EmptyBlock,
  ErrorBlock,
  Field,
  InlineNotice,
  KpiCard,
  LoadingBlock,
  Modal,
  PageHeader,
  SectionCard,
  Spinner,
} from '../components/ui';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'bn', label: 'Bengali' },
];

function linkTone(status: string) {
  switch (status) {
    case 'VERIFIED':
      return 'green';
    case 'PENDING':
      return 'amber';
    case 'REVOKED':
      return 'slate';
    default:
      return 'red';
  }
}

export function GuardiansPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'ADMIN';
  const isGuardian = user?.role === 'GUARDIAN';

  const [tick, setTick] = useState(0);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [acceptCodes, setAcceptCodes] = useState<Record<string, string>>({});
  const [acceptBusy, setAcceptBusy] = useState<string | null>(null);
  const [revokeBusy, setRevokeBusy] = useState<string | null>(null);
  const [childModal, setChildModal] = useState(false);
  const [childBusy, setChildBusy] = useState(false);
  const [childForm, setChildForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    preferredLanguage: 'en',
  });

  const adminState = useAsyncData(() => fetchAllGuardianLinks(), [tick], isAdmin);
  const ownState = useAsyncData(() => fetchGuardianLinks(), [tick], !isAdmin);

  const reload = () => setTick((value) => value + 1);

  const adminLinks = adminState.data?.links ?? [];
  const ownLinks = ownState.data;
  const asGuardian = ownLinks?.asGuardian ?? [];
  const asChild = ownLinks?.asChild ?? [];

  const verifiedCount = adminLinks.filter((link) => link.status === 'VERIFIED').length;
  const pendingCount = adminLinks.filter((link) => link.status === 'PENDING').length;
  const revokedCount = adminLinks.filter((link) => link.status === 'REVOKED').length;

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteBusy(true);
    setInviteCode(null);
    try {
      const result = await inviteChild(inviteEmail.trim());
      toast('Invitation created. The child must accept with the consent code.', 'success');
      setInviteCode(result.devCode ?? null);
      setInviteEmail('');
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Invitation failed', 'error');
    } finally {
      setInviteBusy(false);
    }
  };

  const acceptLink = async (link: GuardianLink) => {
    const code = (acceptCodes[link.id] ?? '').trim();
    if (code.length !== 6) {
      toast('Enter the 6-digit consent code.', 'error');
      return;
    }
    setAcceptBusy(link.id);
    try {
      await acceptGuardianLink(link.id, code);
      toast('Guardian link verified.', 'success');
      setAcceptCodes((current) => ({ ...current, [link.id]: '' }));
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not accept the link', 'error');
    } finally {
      setAcceptBusy(null);
    }
  };

  const revoke = async (id: string, label: string) => {
    if (!window.confirm(`Revoke the guardian link with ${label}? Access to incidents ends immediately.`)) {
      return;
    }
    setRevokeBusy(id);
    try {
      await revokeGuardianLink(id);
      toast('Guardian link revoked.', 'success');
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not revoke the link', 'error');
    } finally {
      setRevokeBusy(null);
    }
  };

  const submitChild = async (event: FormEvent) => {
    event.preventDefault();
    setChildBusy(true);
    try {
      const result = await createChildAccount({
        fullName: childForm.fullName.trim(),
        email: childForm.email.trim(),
        phone: childForm.phone.trim(),
        password: childForm.password,
        preferredLanguage: childForm.preferredLanguage,
      });
      toast(`Child account created and verified: ${result.child.fullName}.`, 'success');
      setChildModal(false);
      setChildForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        preferredLanguage: 'en',
      });
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create the child account', 'error');
    } finally {
      setChildBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Guardians & children"
        description="Consent-based guardian links. A link becomes verified only when the child accepts with the 6-digit consent code — or when a guardian creates the child account directly."
        actions={
          <>
            {isGuardian ? (
              <button type="button" className="btn btn-primary" onClick={() => setChildModal(true)}>
                <Icon name="plus" size={16} /> Create child account
              </button>
            ) : null}
            <button type="button" className="btn btn-secondary" onClick={reload}>
              <Icon name="refresh" size={16} /> Refresh
            </button>
          </>
        }
      />

      {isAdmin ? (
        <>
          <div className="kpi-grid kpi-grid-four">
            <KpiCard label="All links" value={adminLinks.length} icon="family" tone="blue" />
            <KpiCard label="Verified" value={verifiedCount} icon="check" tone="green" />
            <KpiCard label="Pending consent" value={pendingCount} icon="clock" tone="amber" />
            <KpiCard label="Revoked" value={revokedCount} icon="lock" tone="slate" />
          </div>

          <SectionCard title="All guardian links" subtitle="Administrator overview — newest first">
            {adminState.error && !adminState.data ? (
              <ErrorBlock error={adminState.error} onRetry={adminState.reload} />
            ) : null}
            {!adminState.data && adminState.loading ? (
              <LoadingBlock label="Loading guardian links…" />
            ) : null}
            {adminState.data && adminLinks.length === 0 ? (
              <EmptyBlock
                icon="family"
                title="No guardian links yet"
                message="Once guardians invite children and consent is given, links will appear here."
              />
            ) : null}

            {adminLinks.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Guardian</th>
                      <th>Child</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Verified</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {adminLinks.map((link) => (
                      <tr key={link.id}>
                        <td>
                          <div className="cell-stack">
                            <span>{link.guardian?.fullName ?? 'Deleted account'}</span>
                            <span className="muted small">
                              {link.guardian?.email ?? '—'} ·{' '}
                              {link.guardian ? maskPhone(link.guardian.phone) : '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <span>{link.child?.fullName ?? 'Deleted account'}</span>
                            <span className="muted small">
                              {link.child?.email ?? '—'} ·{' '}
                              {link.child ? maskPhone(link.child.phone) : '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Badge tone={linkTone(link.status)} dot>
                            {titleCase(link.status)}
                          </Badge>
                        </td>
                        <td>{formatDateTime(link.createdAt)}</td>
                        <td>{link.verifiedAt ? formatDateTime(link.verifiedAt) : '—'}</td>
                        <td>
                          {link.status !== 'REVOKED' ? (
                            <button
                              type="button"
                              className="btn btn-danger-ghost btn-small"
                              disabled={revokeBusy === link.id}
                              onClick={() =>
                                void revoke(link.id, link.child?.fullName ?? 'this child')
                              }
                            >
                              {revokeBusy === link.id ? <Spinner label="Revoking" /> : null}
                              Revoke
                            </button>
                          ) : (
                            <span className="muted small">Revoked {timeAgo(link.revokedAt)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </SectionCard>
        </>
      ) : (
        <>
          {ownState.error && !ownState.data ? (
            <ErrorBlock error={ownState.error} onRetry={ownState.reload} />
          ) : null}
          {!ownState.data && ownState.loading ? (
            <LoadingBlock label="Loading your guardian links…" />
          ) : null}

          {isGuardian ? (
            <div className="guardian-tools">
              <SectionCard
                title="Invite an existing account"
                subtitle="The child must sign in and accept with the consent code."
              >
                <form onSubmit={(event) => void submitInvite(event)} className="inline-form">
                  <div className="field field-grow">
                    <label htmlFor="invite-email">Child's account email</label>
                    <input
                      id="invite-email"
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="child@example.com"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={inviteBusy}>
                    {inviteBusy ? <Spinner label="Inviting" /> : <Icon name="mail" size={16} />}
                    Send invitation
                  </button>
                </form>
                {inviteCode ? (
                  <InlineNotice tone="warn">
                    Development consent code: <strong className="mono-cell">{inviteCode}</strong>
                    . It is also printed in the backend console. In production it is delivered to
                    the child through the configured provider, never returned by the API.
                  </InlineNotice>
                ) : null}
              </SectionCard>

              <SectionCard title="Create a child account" subtitle="For children without their own account">
                <p className="muted">
                  Create a verified child account directly. The guardian link is active
                  immediately and the child can sign in with the password you set.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary mt-12"
                  onClick={() => setChildModal(true)}
                >
                  <Icon name="plus" size={16} /> Open child account form
                </button>
              </SectionCard>
            </div>
          ) : null}

          <SectionCard
            title="Children you guard"
            subtitle="Accounts whose incidents you are permitted to view"
          >
            {asGuardian.length === 0 ? (
              <EmptyBlock
                icon="family"
                title="No linked children"
                message={
                  isGuardian
                    ? 'Invite a child by email or create a child account to start a consent-based link.'
                    : 'No guardian links are associated with your account.'
                }
              />
            ) : (
              <ul className="link-list">
                {asGuardian.map((link) => (
                  <li key={link.id}>
                    <span className="avatar">{link.counterpart?.fullName.charAt(0) ?? '?'}</span>
                    <div className="link-main">
                      <strong>{link.counterpart?.fullName ?? 'Account unavailable'}</strong>
                      <span className="muted small">
                        {link.counterpart?.email ?? '—'} · {link.counterpart?.phoneMasked ?? '—'}
                      </span>
                      <span className="muted small">Linked {timeAgo(link.createdAt)}</span>
                    </div>
                    <div className="link-side">
                      <Badge tone={linkTone(link.status)} dot>
                        {titleCase(link.status)}
                      </Badge>
                      {link.status !== 'REVOKED' ? (
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-small"
                          disabled={revokeBusy === link.id}
                          onClick={() =>
                            void revoke(link.id, link.counterpart?.fullName ?? 'this child')
                          }
                        >
                          {revokeBusy === link.id ? <Spinner label="Revoking" /> : null}
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Your guardians"
            subtitle="People who may receive and respond to your incidents"
          >
            {asChild.length === 0 ? (
              <EmptyBlock
                icon="users"
                title="No guardian link"
                message="A guardian can invite you by email. You will need the 6-digit consent code to approve the link."
              />
            ) : (
              <ul className="link-list">
                {asChild.map((link) => (
                  <li key={link.id} className="link-list-accept">
                    <span className="avatar">{link.counterpart?.fullName.charAt(0) ?? '?'}</span>
                    <div className="link-main">
                      <strong>{link.counterpart?.fullName ?? 'Account unavailable'}</strong>
                      <span className="muted small">
                        {link.counterpart?.email ?? '—'} · {link.counterpart?.phoneMasked ?? '—'}
                      </span>
                      <span className="muted small">
                        Invited {timeAgo(link.createdAt)} · {titleCase(link.status)}
                      </span>
                      {link.status === 'PENDING' ? (
                        <div className="accept-row">
                          <label htmlFor={`accept-${link.id}`}>Consent code</label>
                          <input
                            id={`accept-${link.id}`}
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            placeholder="6-digit code"
                            value={acceptCodes[link.id] ?? ''}
                            onChange={(event) =>
                              setAcceptCodes((current) => ({
                                ...current,
                                [link.id]: event.target.value.replace(/\D/g, '').slice(0, 6),
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-small"
                            disabled={
                              acceptBusy === link.id ||
                              (acceptCodes[link.id] ?? '').length !== 6
                            }
                            onClick={() => void acceptLink(link)}
                          >
                            {acceptBusy === link.id ? <Spinner label="Verifying" /> : null}
                            Accept link
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="link-side">
                      <Badge tone={linkTone(link.status)} dot>
                        {titleCase(link.status)}
                      </Badge>
                      {link.status === 'VERIFIED' ? (
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-small"
                          disabled={revokeBusy === link.id}
                          onClick={() =>
                            void revoke(link.id, link.counterpart?.fullName ?? 'this guardian')
                          }
                        >
                          {revokeBusy === link.id ? <Spinner label="Revoking" /> : null}
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      <Modal
        open={childModal}
        title="Create a verified child account"
        description="The guardian link is created immediately with VERIFIED status."
        onClose={() => setChildModal(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setChildModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="child-account-form"
              className="btn btn-primary"
              disabled={childBusy}
            >
              {childBusy ? <Spinner label="Creating" /> : null}
              Create child account
            </button>
          </>
        }
      >
        <form id="child-account-form" onSubmit={(event) => void submitChild(event)}>
          <Field label="Full name" htmlFor="child-name">
            <input
              id="child-name"
              required
              minLength={2}
              maxLength={120}
              value={childForm.fullName}
              onChange={(event) =>
                setChildForm((current) => ({ ...current, fullName: event.target.value }))
              }
            />
          </Field>
          <Field label="Email" htmlFor="child-email">
            <input
              id="child-email"
              type="email"
              required
              value={childForm.email}
              onChange={(event) =>
                setChildForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </Field>
          <Field label="Phone" htmlFor="child-phone" hint="Include country code, e.g. +9198…">
            <input
              id="child-phone"
              type="tel"
              required
              value={childForm.phone}
              onChange={(event) =>
                setChildForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </Field>
          <Field
            label="Temporary password"
            htmlFor="child-password"
            hint="At least 8 characters. Share it with the child through a safe channel."
          >
            <input
              id="child-password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={childForm.password}
              onChange={(event) =>
                setChildForm((current) => ({ ...current, password: event.target.value }))
              }
            />
          </Field>
          <Field label="Preferred language" htmlFor="child-language">
            <select
              id="child-language"
              value={childForm.preferredLanguage}
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  preferredLanguage: event.target.value,
                }))
              }
            >
              {LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </Field>
        </form>
      </Modal>
    </>
  );
}

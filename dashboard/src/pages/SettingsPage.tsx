import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import { API_URL, updateMeRequest, verifyOtpRequest } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { Icon } from '../components/Icons';
import {
  Badge,
  Field,
  InlineNotice,
  PageHeader,
  RoleBadge,
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

export function SettingsPage() {
  const { user, updateUser, logoutAll, requestDeletion } = useAuth();
  const { connected, socketId } = useRealtime();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [language, setLanguage] = useState(user?.preferredLanguage ?? 'en');
  const [saving, setSaving] = useState(false);
  const [otpRequired, setOtpRequired] = useState(!user?.phoneVerified);
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  if (!user) return null;

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await updateMeRequest({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        preferredLanguage: language,
      });
      updateUser(result.user);
      setOtpRequired(result.otpRequired);
      toast('Profile updated.', 'success');
      if (result.otpRequired) {
        toast('Phone changed — verify the new number with the OTP.', 'info');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmOtp = async () => {
    setOtpBusy(true);
    try {
      const result = await verifyOtpRequest(otpCode.trim());
      updateUser(result.user);
      setOtpRequired(false);
      setOtpCode('');
      toast('Phone verified.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Verification failed', 'error');
    } finally {
      setOtpBusy(false);
    }
  };

  const signOutEverywhere = async () => {
    if (!window.confirm('Sign out of every session on every device?')) return;
    setSessionBusy(true);
    try {
      await logoutAll();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not revoke sessions', 'error');
      setSessionBusy(false);
    }
  };

  const requestRemoval = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteBusy(true);
    try {
      await requestDeletion();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not request deletion', 'error');
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Your profile, session security, and a reference for the platform's honesty rules. Changes are written to the audit log."
      />

      <div className="settings-grid">
        <SectionCard
          title="Profile"
          subtitle="Used for incident ownership and operator contact"
          className="settings-profile"
        >
          <form onSubmit={(event) => void saveProfile(event)}>
            <Field label="Full name" htmlFor="settings-name">
              <input
                id="settings-name"
                value={fullName}
                minLength={2}
                maxLength={120}
                required
                onChange={(event) => setFullName(event.target.value)}
              />
            </Field>
            <Field
              label="Email"
              htmlFor="settings-email"
              hint="Changing the email marks it unverified on the backend."
            >
              <input
                id="settings-email"
                type="email"
                value={email}
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field
              label="Phone"
              htmlFor="settings-phone"
              hint="Changing the phone requires OTP verification. Alerts depend on a verified number."
            >
              <input
                id="settings-phone"
                type="tel"
                value={phone}
                required
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field label="Preferred language" htmlFor="settings-language">
              <select
                id="settings-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner label="Saving" /> : <Icon name="check" size={16} />}
              Save profile
            </button>
          </form>

          {otpRequired ? (
            <div className="otp-panel">
              <InlineNotice tone="warn">
                Your phone number is not verified. In development, the 6-digit code is printed in
                the backend console (<span className="mono-cell">[otp]</span> log line). In
                production it is sent through the configured SMS provider.
              </InlineNotice>
              <div className="inline-form">
                <div className="field field-grow">
                  <label htmlFor="settings-otp">Verification code</label>
                  <input
                    id="settings-otp"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={otpCode}
                    onChange={(event) =>
                      setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="000000"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={otpBusy || otpCode.length !== 6}
                  onClick={() => void confirmOtp()}
                >
                  {otpBusy ? <Spinner label="Verifying" /> : null}
                  Verify phone
                </button>
              </div>
            </div>
          ) : null}
        </SectionCard>

        <div className="stack">
          <SectionCard title="Account & session">
            <dl className="settings-facts">
              <div>
                <dt>Role</dt>
                <dd>
                  <RoleBadge role={user.role} />
                </dd>
              </div>
              <div>
                <dt>Account type</dt>
                <dd>{user.accountType}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <Badge tone={user.status === 'ACTIVE' ? 'green' : 'amber'} dot>
                    {user.status.replace(/_/g, ' ')}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>Email verified</dt>
                <dd>{user.emailVerified ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{formatDateTime(user.createdAt)}</dd>
              </div>
              <div>
                <dt>Last login</dt>
                <dd>{formatDateTime(user.lastLoginAt)}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Realtime connection">
            <div className={`connection-row ${connected ? 'is-online' : 'is-offline'}`}>
              <span className="connection-dot" aria-hidden="true" />
              <div>
                <strong>{connected ? 'Authenticated socket connected' : 'Not connected'}</strong>
                <p className="muted small">
                  {connected
                    ? `Socket ${socketId ?? ''}. The connection is force-closed when its access token expires.`
                    : 'The dashboard is reconnecting and refreshing data every 30 seconds in the meantime.'}
                </p>
              </div>
            </div>
            <p className="muted small mt-12">
              API endpoint: <span className="mono-cell">{API_URL}</span>
            </p>
          </SectionCard>

          <SectionCard title="Session security">
            <p className="muted">
              The access token lives in memory only and is never written to localStorage. The
              refresh token is an <span className="mono-cell">httpOnly</span> cookie rotated on
              every use. Revoking all sessions also clears the cookie in this browser.
            </p>
            <button
              type="button"
              className="btn btn-secondary mt-12"
              disabled={sessionBusy}
              onClick={() => void signOutEverywhere()}
            >
              {sessionBusy ? <Spinner label="Signing out" /> : <Icon name="logout" size={16} />}
              Sign out of all devices
            </button>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="How to read this dashboard"
        subtitle="The platform is designed to avoid false reassurance"
      >
        <ul className="honesty-list">
          <li>
            <Badge tone="amber">PENDING_SYNC</Badge>
            <span>
              The incident was created offline. Its original device time is preserved and{' '}
              <strong>offlineDelaySeconds</strong> shows how late the server received it.
            </span>
          </li>
          <li>
            <Badge tone="blue">SENT</Badge>
            <span>
              The notification provider accepted the message. This is not proof it reached a
              phone.
            </span>
          </li>
          <li>
            <Badge tone="green">DELIVERED</Badge>
            <span>
              A provider webhook with a valid HMAC signature confirmed delivery. It cannot be set
              by the dashboard.
            </span>
          </li>
          <li>
            <Badge tone="amber">Simulated</Badge>
            <span>
              Console mode is active. The message was logged, not sent. Never treat it as a real
              alert.
            </span>
          </li>
          <li>
            <Badge tone="red">DELIVERY_FAILED</Badge>
            <span>
              Nobody verified could be reached. The system says so explicitly instead of implying
              help is coming.
            </span>
          </li>
        </ul>
      </SectionCard>

      <SectionCard title="Danger zone" subtitle="Account deletion is a request, not an instant hard delete">
        <p className="muted">
          Requesting deletion suspends the account, revokes all refresh sessions, and marks the
          account for operational follow-up. Historical incident records remain for safety and
          audit integrity.
        </p>
        <div className="danger-row">
          <div className="field">
            <label htmlFor="delete-confirm">
              Type <span className="mono-cell">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="DELETE"
            />
          </div>
          <button
            type="button"
            className="btn btn-danger"
            disabled={deleteBusy || deleteConfirm !== 'DELETE'}
            onClick={() => void requestRemoval()}
          >
            {deleteBusy ? <Spinner label="Requesting" /> : <Icon name="alert" size={16} />}
            Request account deletion
          </button>
        </div>
      </SectionCard>
    </>
  );
}

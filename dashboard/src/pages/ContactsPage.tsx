import { useState, type FormEvent } from 'react';
import { useToast } from '../context/ToastContext';
import {
  confirmContactVerification,
  createContact,
  deleteContact,
  fetchContacts,
  requestContactVerification,
  setPrimaryContact,
} from '../lib/api';
import { formatDateTime, timeAgo, titleCase } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { RELATIONSHIPS, type Relationship, type TrustedContact } from '../types';
import { Icon } from '../components/Icons';
import {
  Badge,
  EmptyBlock,
  ErrorBlock,
  Field,
  InlineNotice,
  LoadingBlock,
  Modal,
  PageHeader,
  SectionCard,
  Spinner,
} from '../components/ui';

const EMPTY_FORM = {
  name: '',
  phone: '',
  relationship: 'OTHER' as Relationship,
  email: '',
};

export function ContactsPage() {
  const { toast } = useToast();
  const [tick, setTick] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addBusy, setAddBusy] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<TrustedContact | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const state = useAsyncData(() => fetchContacts(), [tick]);
  const contacts = state.data?.contacts ?? [];
  const reload = () => setTick((value) => value + 1);

  const submitAdd = async (event: FormEvent) => {
    event.preventDefault();
    setAddBusy(true);
    try {
      await createContact({
        name: form.name.trim(),
        phone: form.phone.trim(),
        relationship: form.relationship,
        email: form.email.trim() || undefined,
      });
      toast('Trusted contact added. Verify their phone before relying on alerts.', 'success');
      setAddOpen(false);
      setForm(EMPTY_FORM);
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add contact', 'error');
    } finally {
      setAddBusy(false);
    }
  };

  const sendCode = async (contact: TrustedContact) => {
    setRequesting(true);
    setDevCode(null);
    try {
      const result = await requestContactVerification(contact.id);
      setDevCode(result.devCode ?? null);
      toast('Verification code sent.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not send verification code', 'error');
    } finally {
      setRequesting(false);
    }
  };

  const openVerify = (contact: TrustedContact) => {
    setVerifyTarget(contact);
    setVerifyCode('');
    setDevCode(null);
    void sendCode(contact);
  };

  const confirmCode = async () => {
    if (!verifyTarget) return;
    setVerifyBusy(true);
    try {
      await confirmContactVerification(verifyTarget.id, verifyCode.trim());
      toast(`${verifyTarget.name} verified. They can now receive alerts.`, 'success');
      setVerifyTarget(null);
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Verification failed', 'error');
    } finally {
      setVerifyBusy(false);
    }
  };

  const makePrimary = async (contact: TrustedContact) => {
    setBusyId(contact.id);
    try {
      await setPrimaryContact(contact.id);
      toast(`${contact.name} is now the primary contact.`, 'success');
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not set primary contact', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (contact: TrustedContact) => {
    if (
      !window.confirm(
        `Remove ${contact.name} from your trusted contacts? They will stop receiving alerts.`,
      )
    ) {
      return;
    }
    setBusyId(contact.id);
    try {
      await deleteContact(contact.id);
      toast(`${contact.name} removed.`, 'success');
      reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not remove contact', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Trusted contacts"
        description="The people who receive your alerts. Contacts are private to their owner — administrators cannot read or edit them. Only verified contacts are used for emergency delivery."
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={16} /> Add contact
            </button>
            <button type="button" className="btn btn-secondary" onClick={reload}>
              <Icon name="refresh" size={16} /> Refresh
            </button>
          </>
        }
      />

      <InlineNotice>
        There is a limit of 20 contacts. The first contact becomes primary automatically. Only
        <strong> VERIFIED</strong> contacts are alerted — an unverified number is never treated as
        reachable.
      </InlineNotice>

      {state.error && !state.data ? (
        <ErrorBlock error={state.error} onRetry={state.reload} />
      ) : null}
      {!state.data && state.loading ? <LoadingBlock label="Loading trusted contacts…" /> : null}

      {state.data && contacts.length === 0 ? (
        <SectionCard>
          <EmptyBlock
            icon="contacts"
            title="No trusted contacts yet"
            message="Add someone you trust, then verify their phone. Without a verified contact, an emergency alert ends in DELIVERY_FAILED — the system will not pretend help is on the way."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <Icon name="plus" size={16} /> Add your first contact
              </button>
            }
          />
        </SectionCard>
      ) : null}

      {contacts.length > 0 ? (
        <div className="contact-grid">
          {contacts.map((contact) => (
            <article key={contact.id} className="contact-card">
              <div className="contact-head">
                <span className="avatar avatar-large">{contact.name.charAt(0)}</span>
                <div className="contact-title">
                  <strong>{contact.name}</strong>
                  <span className="muted small">
                    {titleCase(contact.relationship)} · {contact.phoneMasked}
                  </span>
                </div>
                <div className="contact-badges">
                  {contact.isPrimary ? <Badge tone="purple">Primary</Badge> : null}
                  <Badge
                    tone={
                      contact.verificationStatus === 'VERIFIED'
                        ? 'green'
                        : contact.verificationStatus === 'PENDING'
                          ? 'amber'
                          : 'slate'
                    }
                    dot
                  >
                    {titleCase(contact.verificationStatus)}
                  </Badge>
                </div>
              </div>

              <dl className="contact-meta">
                <div>
                  <dt>Phone</dt>
                  <dd>{contact.phoneMasked}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{contact.email || '—'}</dd>
                </div>
                <div>
                  <dt>Verified</dt>
                  <dd>{contact.verifiedAt ? formatDateTime(contact.verifiedAt) : 'Not yet'}</dd>
                </div>
                <div>
                  <dt>Added</dt>
                  <dd>{timeAgo(contact.createdAt)}</dd>
                </div>
              </dl>

              <div className="channel-row">
                <span className="muted small">Channels:</span>
                {contact.notificationPreferences.sms ? <Badge tone="blue">SMS</Badge> : null}
                {contact.notificationPreferences.whatsapp ? (
                  <Badge tone="teal">WhatsApp</Badge>
                ) : null}
                {contact.notificationPreferences.push ? <Badge tone="slate">Push</Badge> : null}
              </div>

              <div className="contact-actions">
                {contact.verificationStatus !== 'VERIFIED' ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => openVerify(contact)}
                  >
                    <Icon name="check" size={15} />
                    {contact.verificationStatus === 'PENDING' ? 'Enter code' : 'Verify phone'}
                  </button>
                ) : null}
                {contact.verificationStatus === 'VERIFIED' && !contact.isPrimary ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    disabled={busyId === contact.id}
                    onClick={() => void makePrimary(contact)}
                  >
                    {busyId === contact.id ? <Spinner label="Saving" /> : null}
                    Make primary
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-danger-ghost btn-small"
                  disabled={busyId === contact.id}
                  onClick={() => void remove(contact)}
                >
                  <Icon name="trash" size={15} /> Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <Modal
        open={addOpen}
        title="Add a trusted contact"
        description="They will be alerted only after their phone number is verified."
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="add-contact-form"
              className="btn btn-primary"
              disabled={addBusy}
            >
              {addBusy ? <Spinner label="Adding" /> : null}
              Add contact
            </button>
          </>
        }
      >
        <form id="add-contact-form" onSubmit={(event) => void submitAdd(event)}>
          <Field label="Full name" htmlFor="contact-name">
            <input
              id="contact-name"
              required
              minLength={2}
              maxLength={120}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field
            label="Phone"
            htmlFor="contact-phone"
            hint="Include country code, e.g. +919876543210"
          >
            <input
              id="contact-phone"
              type="tel"
              required
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </Field>
          <Field label="Relationship" htmlFor="contact-relationship">
            <select
              id="contact-relationship"
              value={form.relationship}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  relationship: event.target.value as Relationship,
                }))
              }
            >
              {RELATIONSHIPS.map((relationship) => (
                <option key={relationship} value={relationship}>
                  {titleCase(relationship)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email (optional)" htmlFor="contact-email">
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={verifyTarget !== null}
        title={`Verify ${verifyTarget?.name ?? 'contact'}`}
        description="Enter the 6-digit code sent to this contact's phone."
        onClose={() => setVerifyTarget(null)}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setVerifyTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={verifyBusy || verifyCode.length !== 6}
              onClick={() => void confirmCode()}
            >
              {verifyBusy ? <Spinner label="Verifying" /> : null}
              Verify contact
            </button>
          </>
        }
      >
        {devCode ? (
          <InlineNotice tone="warn">
            Development verification code: <strong className="mono-cell">{devCode}</strong>. It is
            also printed in the backend console. Production deployments never return the code.
          </InlineNotice>
        ) : (
          <p className="muted">
            The code expires after 10 minutes. If it did not arrive, you can request a new one.
          </p>
        )}
        <Field label="Verification code" htmlFor="contact-code">
          <input
            id="contact-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            value={verifyCode}
            onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
          />
        </Field>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={requesting || !verifyTarget}
          onClick={() => verifyTarget && void sendCode(verifyTarget)}
        >
          {requesting ? <Spinner label="Sending" /> : <Icon name="refresh" size={14} />}
          Resend code
        </button>
      </Modal>
    </>
  );
}

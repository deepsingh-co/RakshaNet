import { useEffect, useState } from 'react';
import { useContacts } from '../../store/contactsStore';
import { normalizePhone } from '../../data/contactsRepo';
import type { Channel, ConsentState } from '../../domain/types';

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS', label: 'SMS' },
  { value: 'CALL', label: 'Call' },
  { value: 'SHARE', label: 'Share' },
];

const CONSENT_LABEL: Record<ConsentState, string> = {
  INVITED: 'Not consented',
  CONSENTED: 'Consented',
  REVOKED: 'Revoked',
};

const CONSENT_STYLE: Record<ConsentState, string> = {
  INVITED: 'bg-slate-100 text-ink-soft',
  CONSENTED: 'bg-safe-soft text-safe',
  REVOKED: 'bg-brand-soft text-brand',
};

export function ContactsScreen() {
  const { contacts, loaded, load, add, remove, setConsent } = useContacts();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const consentedCount = contacts.filter((c) => c.consent === 'CONSENTED').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Trusted contacts</h1>
          {contacts.length > 0 && (
            <p className="text-sm text-ink-soft">
              {consentedCount} of {contacts.length} will receive alerts
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn btn-primary px-3.5 py-2 text-sm"
        >
          {showForm ? 'Close' : '+ Add'}
        </button>
      </div>

      <p className="text-sm leading-relaxed text-ink-soft">
        Only <strong className="text-ink">consented</strong> contacts get automatic SOS alerts.
        You can revoke anyone instantly.
      </p>

      {showForm && <ContactForm onDone={() => setShowForm(false)} add={add} />}

      {contacts.length === 0 ? (
        <div className="card border-dashed p-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-safe-soft">
            <svg className="size-6 text-safe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-ink">No contacts yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add someone you trust — they must agree before they receive any alert.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {contacts.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      c.consent === 'CONSENTED' ? 'bg-safe-soft text-safe' : 'bg-slate-100 text-ink-soft'
                    }`}
                    aria-hidden
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">
                      {c.name}
                      {c.relation && <span className="ml-1.5 text-sm font-normal text-ink-faint">({c.relation})</span>}
                    </p>
                    <p className="text-sm text-ink-soft">{c.phone}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.channels.map((ch) => (
                        <span
                          key={ch}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-soft"
                        >
                          {CHANNEL_OPTIONS.find((o) => o.value === ch)?.label ?? ch}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${CONSENT_STYLE[c.consent]}`}
                >
                  {CONSENT_LABEL[c.consent]}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {c.consent !== 'CONSENTED' && (
                  <SmallBtn onClick={() => void setConsent(c.id, 'CONSENTED')} tone="success">
                    Mark consented
                  </SmallBtn>
                )}
                {c.consent === 'CONSENTED' && (
                  <SmallBtn onClick={() => void setConsent(c.id, 'REVOKED')} tone="warn">
                    Revoke
                  </SmallBtn>
                )}
                {c.consent === 'REVOKED' && <SmallBtn onClick={() => void setConsent(c.id, 'INVITED')}>Reset</SmallBtn>}
                <SmallBtn onClick={() => void remove(c.id)} tone="danger">
                  Delete
                </SmallBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ContactForm({
  onDone,
  add,
}: {
  onDone: () => void;
  add: ReturnType<typeof useContacts.getState>['add'];
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['WHATSAPP', 'SMS']);
  const [error, setError] = useState<string | null>(null);

  const toggle = (ch: Channel) =>
    setChannels((prev) => (prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Name is required.');
    const normalized = normalizePhone(phone);
    if (!/^\+?\d{7,15}$/.test(normalized)) return setError('Enter a valid phone number with country code.');
    if (channels.length === 0) return setError('Pick at least one channel.');
    await add({
      name,
      phone: normalized,
      relation: relation || undefined,
      channels,
      priority: 999,
      consent: 'INVITED',
    });
    onDone();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="card space-y-3.5 p-4">
      <h2 className="text-sm font-bold text-ink">New trusted contact</h2>
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Mom" required />
      </Field>
      <Field label="Phone (with country code)">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input font-mono"
          placeholder="+91 98765 43210"
          inputMode="tel"
          required
        />
      </Field>
      <Field label="Relation (optional)">
        <input value={relation} onChange={(e) => setRelation(e.target.value)} className="input" placeholder="e.g. Mother" />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">Channels</legend>
        <div className="flex flex-wrap gap-2">
          {CHANNEL_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              aria-pressed={channels.includes(o.value)}
              className={`btn rounded-full px-3 py-1.5 text-xs ${
                channels.includes(o.value)
                  ? 'bg-brand text-white'
                  : 'border border-line-strong bg-white text-ink-soft hover:bg-page'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="text-xs leading-relaxed text-ink-faint">
        The contact must agree (consent) before they receive any alert. You can change this later.
      </p>

      {error && <p className="text-sm font-medium text-brand">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1 py-2.5 text-sm">
          Save contact
        </button>
        <button type="button" onClick={onDone} className="btn btn-quiet px-4 py-2.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-faint">{label}</span>
      {children}
    </label>
  );
}

function SmallBtn({
  children,
  onClick,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'neutral' | 'success' | 'warn' | 'danger';
}) {
  const tones = {
    neutral: 'border-line-strong text-ink-soft hover:bg-page',
    success: 'border-emerald-300 text-safe hover:bg-safe-soft',
    warn: 'border-amber-300 text-warn hover:bg-warn-soft',
    danger: 'border-red-300 text-brand hover:bg-brand-soft',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn border px-3 py-1.5 text-xs ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

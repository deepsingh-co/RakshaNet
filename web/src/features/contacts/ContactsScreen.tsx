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
  INVITED: 'bg-slate-800 text-slate-300',
  CONSENTED: 'bg-emerald-950 text-emerald-300',
  REVOKED: 'bg-red-950 text-red-300',
};

export function ContactsScreen() {
  const { contacts, loaded, load, add, remove, setConsent } = useContacts();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Trusted contacts</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"
        >
          {showForm ? 'Close' : '+ Add'}
        </button>
      </div>

      <p className="text-sm text-slate-400">
        Only <strong className="text-slate-300">consented</strong> contacts receive automatic SOS
        alerts. Revocation takes effect immediately.
      </p>

      {showForm && <ContactForm onDone={() => setShowForm(false)} add={add} />}

      {contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
          No contacts yet. Add someone you trust — they must agree to receive your alerts.
        </div>
      ) : (
        <ul className="space-y-3">
          {contacts.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-100">
                    {c.name}
                    {c.relation && <span className="ml-2 text-sm font-normal text-slate-400">({c.relation})</span>}
                  </p>
                  <p className="text-sm text-slate-400">{c.phone}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {c.channels.map((ch) => (
                      <span key={ch} className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
                        {CHANNEL_OPTIONS.find((o) => o.value === ch)?.label ?? ch}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONSENT_STYLE[c.consent]}`}>
                  {CONSENT_LABEL[c.consent]}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {c.consent !== 'CONSENTED' && (
                  <SmallBtn
                    onClick={() => void setConsent(c.id, 'CONSENTED')}
                    tone="success"
                  >
                    Mark consented
                  </SmallBtn>
                )}
                {c.consent === 'CONSENTED' && (
                  <SmallBtn onClick={() => void setConsent(c.id, 'REVOKED')} tone="warn">
                    Revoke
                  </SmallBtn>
                )}
                {c.consent === 'REVOKED' && (
                  <SmallBtn onClick={() => void setConsent(c.id, 'INVITED')}>Reset</SmallBtn>
                )}
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
    <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-slate-300">New trusted contact</h2>
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="e.g. Mom"
          required
        />
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
        <input
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          className="input"
          placeholder="e.g. Mother"
        />
      </Field>
      <fieldset>
        <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Channels</legend>
        <div className="flex flex-wrap gap-2">
          {CHANNEL_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              aria-pressed={channels.includes(o.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                channels.includes(o.value)
                  ? 'bg-red-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-slate-500">
        The contact must agree (consent) before they receive any alert. You can change this later.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-lg bg-red-700 py-2.5 text-sm font-semibold text-white hover:bg-red-600">
          Save contact
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>

      <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid #334155;background:#0f172a;padding:0.625rem 1rem;font-size:0.875rem;color:#e2e8f0} .input:focus{outline:none;border-color:#b91c1c}`}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
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
    neutral: 'border-slate-700 text-slate-300 hover:bg-slate-800',
    success: 'border-emerald-800 text-emerald-300 hover:bg-emerald-950',
    warn: 'border-amber-800 text-amber-300 hover:bg-amber-950',
    danger: 'border-red-900 text-red-400 hover:bg-red-950',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

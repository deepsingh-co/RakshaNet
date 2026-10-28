import { useEffect, useState } from 'react';
import { useSettings } from '../../store/settingsStore';
import { clearAllData, db } from '../../data/db';

export function SettingsScreen() {
  const { profile, loaded, load, save } = useSettings();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ events: 0, contacts: 0, deliveries: 0 });

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  useEffect(() => {
    setName(profile.name ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  useEffect(() => {
    void Promise.all([db.events.count(), db.contacts.count(), db.deliveries.count()]).then(
      ([events, contacts, deliveries]) => setStats({ events, contacts, deliveries }),
    );
  }, [saved]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save({ name: name.trim() || undefined, phone: phone.trim() || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const wipe = async () => {
    const ok = window.confirm(
      'Delete ALL local data?\n\nThis erases every event, contact, delivery record, and setting on this device. This cannot be undone.',
    );
    if (!ok) return;
    await clearAllData();
    window.location.reload();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Settings</h1>

      <section className="card p-4">
        <h2 className="text-sm font-bold text-ink">Your profile</h2>
        <p className="mb-3 mt-1 text-xs leading-relaxed text-ink-faint">
          Used to personalize emergency messages. Stored only on this device.
        </p>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-faint">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-faint">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91…"
              inputMode="tel"
              className="input font-mono"
            />
          </label>
          <button type="submit" className="btn btn-primary px-4 py-2 text-sm">
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-bold text-ink">Data on this device</h2>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Events" value={stats.events} />
          <Stat label="Contacts" value={stats.contacts} />
          <Stat label="Deliveries" value={stats.deliveries} />
        </dl>
        <button
          type="button"
          onClick={() => void wipe()}
          className="btn mt-4 w-full border border-red-300 bg-white py-2.5 text-sm text-brand hover:bg-brand-soft"
        >
          Delete all data
        </button>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-bold text-ink">How delivery status works</h2>
        <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-ink-soft">
          <li>
            <span className="font-semibold text-ink">Queued</span> — saved on your device, not yet handed to any app.
          </li>
          <li>
            <span className="font-semibold text-warn">Prepared</span> — the messaging app opened with your message.{' '}
            <em className="text-warn">It is not sent until you press send.</em>
          </li>
          <li>
            <span className="font-semibold text-safe">Sent</span> — you confirmed the message went out.
          </li>
          <li>
            <span className="font-semibold text-info">Acknowledged</span> — the recipient confirmed they received it.
          </li>
        </ul>
        <p className="mt-3 border-t border-line pt-3 text-xs text-ink-faint">
          RakshaNet never claims a message was delivered just because it opened WhatsApp.
        </p>
      </section>

      <p className="pb-4 text-center text-xs text-ink-faint">RakshaNet web v0.1.0 · offline-first safety PWA</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-page py-2.5 ring-1 ring-line">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-lg font-bold text-ink">{value}</dd>
    </div>
  );
}

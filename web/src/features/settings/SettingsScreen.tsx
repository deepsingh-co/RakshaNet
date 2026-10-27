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
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-300">Your profile</h2>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          Used to personalize emergency messages. Stored only on this device.
        </p>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-red-700 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91…"
              inputMode="tel"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm focus:border-red-700 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-300">Data on this device</h2>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Stat label="Events" value={stats.events} />
          <Stat label="Contacts" value={stats.contacts} />
          <Stat label="Deliveries" value={stats.deliveries} />
        </dl>
        <button
          type="button"
          onClick={() => void wipe()}
          className="mt-4 w-full rounded-lg border border-red-900 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-950"
        >
          Delete all data
        </button>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">How delivery status works</h2>
        <ul className="space-y-1.5 text-xs leading-relaxed">
          <li><strong className="text-slate-300">Queued</strong> — saved on your device, not yet handed to any app.</li>
          <li><strong className="text-slate-300">Prepared</strong> — the messaging app opened with your message. <em>It is not sent until you press send.</em></li>
          <li><strong className="text-slate-300">Sent</strong> — you confirmed the message went out.</li>
          <li><strong className="text-slate-300">Acknowledged</strong> — the recipient confirmed they received it.</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          RakshaNet never claims a message was delivered just because it opened WhatsApp.
        </p>
      </section>

      <p className="pb-4 text-center text-xs text-slate-600">
        RakshaNet web v0.1.0 · offline-first safety PWA
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-950 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-lg font-bold text-slate-200">{value}</dd>
    </div>
  );
}

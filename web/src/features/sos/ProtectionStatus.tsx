import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContacts } from '../../store/contactsStore';
import { getCachedFix, permissionState } from '../../services/location';

type CheckState = 'ok' | 'warn' | 'bad';

interface Check {
  key: string;
  state: CheckState;
  label: string;
  detail: string;
  action?: { text: string; to: string };
}

/**
 * "Am I ready?" — the safety reassurance card.
 * Shows at a glance whether an SOS can actually reach people right now.
 */
export function ProtectionStatus() {
  const contacts = useContacts((s) => s.contacts);
  const [hasFix, setHasFix] = useState<boolean | null>(null);
  const [geoPermission, setGeoPermission] = useState<PermissionState | 'unsupported'>('prompt');

  useEffect(() => {
    void getCachedFix().then((fix) => setHasFix(fix !== null));
    void permissionState().then(setGeoPermission);
  }, []);

  const consented = contacts.filter((c) => c.consent === 'CONSENTED');
  const withChannels = consented.filter((c) => c.channels.length > 0);

  const checks: Check[] = [
    withChannels.length > 0
      ? {
          key: 'contacts',
          state: 'ok',
          label: `${withChannels.length} trusted ${withChannels.length === 1 ? 'contact' : 'contacts'} ready`,
          detail: withChannels.map((c) => c.name).join(', '),
          action: { text: 'Manage', to: '/contacts' },
        }
      : {
          key: 'contacts',
          state: 'bad',
          label: 'No contacts to alert',
          detail: 'Add someone who can help you',
          action: { text: 'Add contact', to: '/contacts' },
        },
    geoPermission === 'denied'
      ? {
          key: 'location',
          state: 'bad',
          label: 'Location blocked',
          detail: 'Allow location in browser settings for accurate alerts',
        }
      : hasFix === false
        ? {
            key: 'location',
            state: 'warn',
            label: 'Location not captured yet',
            detail: 'It is requested the first time you need it',
          }
        : {
            key: 'location',
            state: 'ok',
            label: 'Location ready',
            detail: 'Your coordinates will be shared with alerts',
          },
    {
      key: 'offline',
      state: 'ok',
      label: 'Works without internet',
      detail: 'SOS, alarm and SMS are saved on this device',
    },
  ];

  return (
    <section className="card w-full overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-safe-soft px-4 py-2.5">
        <svg className="size-4 text-safe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
          <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="text-sm font-bold text-ink">You are protected</h2>
        <span className="ml-auto text-[11px] font-medium text-safe">
          {checks.every((c) => c.state === 'ok') ? 'All ready' : 'Needs attention'}
        </span>
      </div>

      <ul className="divide-y divide-line">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-3 px-4 py-2.5">
            <CheckIcon state={c.state} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight text-ink">{c.label}</p>
              <p className="mt-0.5 truncate text-xs text-ink-faint">{c.detail}</p>
            </div>
            {c.action && (
              <Link
                to={c.action.to}
                className="shrink-0 self-center rounded-lg px-2.5 py-1 text-xs font-semibold text-info hover:bg-info-soft"
              >
                {c.action.text}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CheckIcon({ state }: { state: CheckState }) {
  if (state === 'ok') {
    return (
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-safe text-white" aria-hidden>
        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
          <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white ${
        state === 'warn' ? 'bg-warn' : 'bg-brand'
      }`}
      aria-hidden
    >
      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
        <path d="M12 6v6M12 17h.01" strokeLinecap="round" />
      </svg>
    </span>
  );
}

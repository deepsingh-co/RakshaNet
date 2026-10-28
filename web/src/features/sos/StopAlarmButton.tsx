import { useEvents } from '../../store/eventsStore';
import { stopAlarm } from '../../services/alarm';

/**
 * Stop the alarm — the primary action during an active SOS.
 * Confirmation prevents an accidental tap from silencing the alarm
 * while you still need it.
 */
export function StopAlarmButton({
  eventId,
  big = false,
}: {
  eventId?: string;
  big?: boolean;
}) {
  const { resolveEvent, setNotice } = useEvents();

  const handle = async () => {
    if (!eventId) {
      stopAlarm();
      useEvents.setState({ alarmActive: false });
      return;
    }
    const confirmed = window.confirm(
      'Stop the alarm?\n\n• Cancel = false alarm (nothing happened)\n• OK = I am safe / situation resolved',
    );
    if (!confirmed) return;
    await resolveEvent(eventId);
    setNotice('Alarm stopped and event marked resolved.');
  };

  if (big) {
    return (
      <button
        type="button"
        onClick={() => void handle()}
        className="btn w-full bg-safe py-4 text-base text-white shadow-[0_6px_20px_rgb(5_150_105/0.35)] hover:bg-emerald-700"
      >
        I&rsquo;m safe — stop alarm
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handle()}
      className="btn btn-quiet flex-1 px-4 py-3 text-sm text-ink"
    >
      ⏹ Stop alarm
    </button>
  );
}

/** Small counter cell for the active-SOS summary strip. */
export function Summary({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: string;
}) {
  return (
    <div className="flex-1 py-2">
      <p className={`text-lg font-bold leading-none ${tone}`}>{n}</p>
      <p className="mt-0.5 text-[11px] font-medium text-ink-faint">{label}</p>
    </div>
  );
}

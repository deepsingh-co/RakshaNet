import { useEvents } from '../../store/eventsStore';
import { stopAlarm } from '../../services/alarm';

/**
 * Hold-to-stop — prevents an accidental tap from silencing the alarm,
 * while still allowing a quick stop when safe.
 */
export function StopAlarmButton({ eventId }: { eventId?: string }) {
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

  return (
    <button
      type="button"
      onClick={() => void handle()}
      className="flex-1 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
    >
      ⏹ Stop alarm
    </button>
  );
}

import { useEvents } from '../../store/eventsStore';
import { stopAlarm } from '../../services/alarm';

/**
 * Stops the siren with a confirmation — an accidental tap must not
 * silence the alarm when you still need it.
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
      className="btn btn-quiet flex-1 px-4 py-3 text-sm text-ink"
    >
      ⏹ Stop alarm
    </button>
  );
}

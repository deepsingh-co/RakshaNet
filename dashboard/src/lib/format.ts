import type {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  NotificationStatus,
} from '../types';

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const dayFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
});

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return timeFormatter.format(date);
}

export function formatDay(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return dayFormatter.format(date);
}

export function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysAgo(days: number): string {
  return formatDateInput(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(date);
}

export function humanDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds) || seconds < 0) {
    return '—';
  }
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  if (minutes < 60) return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function elapsedSince(value: string): string {
  return humanDuration((Date.now() - new Date(value).getTime()) / 1000);
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function statusLabel(status: IncidentStatus | NotificationStatus): string {
  switch (status) {
    case 'PENDING_SYNC':
      return 'Pending sync';
    case 'DELIVERY_FAILED':
      return 'Delivery failed';
    default:
      return titleCase(status);
  }
}

export function typeLabel(type: IncidentType): string {
  switch (type) {
    case 'SOS':
      return 'SOS button';
    case 'FALL_DETECTED':
      return 'Fall detected';
    case 'VOICE_TRIGGER':
      return 'Voice trigger';
    case 'MANUAL':
      return 'Manual alert';
    default:
      return titleCase(type);
  }
}

export function severityLabel(severity: IncidentSeverity): string {
  return titleCase(severity);
}

export function statusTone(status: IncidentStatus): string {
  switch (status) {
    case 'CREATED':
    case 'PENDING_SYNC':
      return 'slate';
    case 'ALERTING':
    case 'NOTIFIED':
      return 'blue';
    case 'ACKNOWLEDGED':
      return 'teal';
    case 'RESPONDING':
      return 'green';
    case 'ESCALATED':
      return 'orange';
    case 'DELIVERY_FAILED':
      return 'red';
    case 'RESOLVED':
      return 'green';
    case 'CANCELLED':
      return 'slate';
    default:
      return 'slate';
  }
}

export function severityTone(severity: IncidentSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'MEDIUM':
      return 'amber';
    default:
      return 'slate';
  }
}

export function notificationTone(status: NotificationStatus): string {
  switch (status) {
    case 'DELIVERED':
      return 'green';
    case 'SENT':
      return 'teal';
    case 'QUEUED':
    case 'SENDING':
    case 'PENDING_SYNC':
      return 'blue';
    case 'FAILED':
      return 'red';
    default:
      return 'slate';
  }
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

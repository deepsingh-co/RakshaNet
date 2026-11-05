import type {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  Relationship,
} from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const hours24 = date.getHours();
  const hours = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours24 < 12 ? 'am' : 'pm';
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hours}:${minutes} ${suffix}`;
}

export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(date);
}

export function elapsedSince(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function formatDelay(seconds: number): string {
  if (!seconds) return 'None — created online';
  if (seconds < 60) return `${seconds}s late`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m late`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m late`;
}

const STATUS_LABELS: Record<IncidentStatus, string> = {
  CREATED: 'Created',
  PENDING_SYNC: 'Pending sync',
  ALERTING: 'Alerting',
  NOTIFIED: 'Notified',
  ACKNOWLEDGED: 'Acknowledged',
  RESPONDING: 'Responding',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CANCELLED: 'Cancelled',
  DELIVERY_FAILED: 'Delivery failed',
};

export function statusLabel(status: IncidentStatus | string): string {
  return STATUS_LABELS[status as IncidentStatus] ?? String(status).replace(/_/g, ' ').toLowerCase();
}

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export function severityLabel(severity: IncidentSeverity | string): string {
  return SEVERITY_LABELS[severity as IncidentSeverity] ?? String(severity);
}

const TYPE_LABELS: Record<IncidentType, string> = {
  SOS: 'SOS button',
  FALL_DETECTED: 'Fall detected',
  VOICE_TRIGGER: 'Voice trigger',
  MANUAL: 'Manual alert',
};

export function typeLabel(type: IncidentType | string): string {
  return TYPE_LABELS[type as IncidentType] ?? String(type).replace(/_/g, ' ').toLowerCase();
}

const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  MOTHER: 'Mother',
  FATHER: 'Father',
  SPOUSE: 'Spouse',
  SIBLING: 'Sibling',
  FRIEND: 'Friend',
  GUARDIAN: 'Guardian',
  COLLEAGUE: 'Colleague',
  NEIGHBOUR: 'Neighbour',
  OTHER: 'Other',
};

export function relationshipLabel(relationship: string): string {
  return (
    RELATIONSHIP_LABELS[relationship as Relationship] ??
    String(relationship).charAt(0) + String(relationship).slice(1).toLowerCase()
  );
}

export type Tone = 'green' | 'red' | 'amber' | 'orange' | 'blue' | 'purple' | 'slate';

export function statusTone(status: IncidentStatus | string): Tone {
  switch (status) {
    case 'RESOLVED':
      return 'green';
    case 'CANCELLED':
      return 'slate';
    case 'DELIVERY_FAILED':
      return 'red';
    case 'ESCALATED':
      return 'orange';
    case 'ACKNOWLEDGED':
    case 'RESPONDING':
      return 'blue';
    case 'NOTIFIED':
      return 'purple';
    case 'ALERTING':
    case 'PENDING_SYNC':
    case 'CREATED':
      return 'amber';
    default:
      return 'slate';
  }
}

export function severityTone(severity: IncidentSeverity | string): Tone {
  switch (severity) {
    case 'CRITICAL':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'MEDIUM':
      return 'amber';
    default:
      return 'green';
  }
}

export function syncStateLabel(state: string): string {
  switch (state) {
    case 'PENDING_SYNC':
      return 'Waiting to sync';
    case 'SYNC_FAILED':
      return 'Sync failed';
    case 'CANCELLED_LOCAL':
      return 'Cancelled before sync';
    case 'SYNCED':
      return 'Sent to server';
    default:
      return state;
  }
}

export function isActiveStatus(status: IncidentStatus | string): boolean {
  return [
    'CREATED',
    'PENDING_SYNC',
    'ALERTING',
    'NOTIFIED',
    'ACKNOWLEDGED',
    'RESPONDING',
    'ESCALATED',
    'DELIVERY_FAILED',
  ].includes(status);
}

import type {
  DeviceInfo,
  IncidentCreatePayload,
  IncidentSeverity,
  IncidentType,
  LocationInput,
} from '../types';

/**
 * Reporting copy is intentionally Hinglish: the person in danger should not
 * have to translate a sentence while under stress. The surrounding app UI
 * stays English.
 */
export interface HinglishTemplate {
  id: string;
  label: string;
  text: string;
}

export const HINGLISH_TEMPLATES: HinglishTemplate[] = [
  {
    id: 'following',
    label: 'Koi follow kar raha hai',
    text: 'Mujhe koi follow kar raha hai. Main ghar ja rahi hoon aur dar lag raha hai.',
  },
  {
    id: 'home-alone',
    label: 'Ghar par akeli hoon',
    text: 'Main ghar par akeli hoon. Bahar kuch log khade hain, mujhe khatra lag raha hai.',
  },
  {
    id: 'harassment',
    label: 'Koi pareshan kar raha hai',
    text: 'Koi mujhe pareshan kar raha hai. Please turant madad bhejiye.',
  },
  {
    id: 'unsafe-cab',
    label: 'Cab unsafe lag rahi hai',
    text: 'Mujhe cab unsafe lag rahi hai. Driver galat raaste se ja raha hai.',
  },
  {
    id: 'accident',
    label: 'Accident hua hai',
    text: 'Yahan accident hua hai. Kisi ko turant madad chahiye.',
  },
  {
    id: 'child-unsafe',
    label: 'Bachcha unsafe hai',
    text: 'Bachche ko khatra lag raha hai. Please turant contact kijiye.',
  },
];

const DEFAULT_DESCRIPTIONS: Record<IncidentType, string> = {
  SOS: 'SOS button dabaya gaya. Turant madad chahiye.',
  MANUAL: 'Manual safety alert. Mujhe turant madad chahiye.',
  FALL_DETECTED: 'Fall detect hua. Please check kijiye.',
  VOICE_TRIGGER: 'Safety phrase trigger hua. Turant madad chahiye.',
};

export function defaultDescription(type: IncidentType): string {
  return DEFAULT_DESCRIPTIONS[type];
}

export function buildIncidentPayload(input: {
  clientIncidentId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description?: string;
  startedAt: string;
  offlineCreated: boolean;
  location?: LocationInput | null;
  device?: DeviceInfo;
}): IncidentCreatePayload {
  const description = input.description?.trim().slice(0, 500) || defaultDescription(input.type);
  return {
    clientIncidentId: input.clientIncidentId,
    type: input.type,
    severity: input.severity,
    description,
    startedAt: input.startedAt,
    clientCreatedAt: input.startedAt,
    offlineCreated: input.offlineCreated,
    ...(input.location
      ? { location: { ...input.location, offlineCaptured: input.offlineCreated } }
      : {}),
    ...(input.device ? { device: input.device } : {}),
  };
}

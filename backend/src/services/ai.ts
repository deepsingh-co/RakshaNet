import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Safety guidance adapter.
 *
 * The adapter never dispatches emergency services and never creates an
 * incident on its own. It classifies a message, returns Hinglish guidance, and
 * asks the app to confirm a real safety action. In console mode the result is
 * deterministic and explicitly labelled simulated.
 */

export const SAFETY_INTENTS = [
  'SOS',
  'FOLLOWED',
  'HARASSMENT',
  'UNSAFE_CAB',
  'ACCIDENT',
  'HOME_UNSAFE',
  'CHILD_UNSAFE',
  'NEEDS_HELP',
  'INFO',
  'UNKNOWN',
] as const;
export type SafetyIntent = (typeof SAFETY_INTENTS)[number];

export const SAFETY_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type SafetySeverity = (typeof SAFETY_SEVERITIES)[number];

export const SUGGESTED_ACTIONS = [
  'CALL_112',
  'HOLD_SOS',
  'MOVE_TO_SAFE_PLACE',
  'SHARE_LOCATION',
  'ALERT_TRUSTED_CONTACTS',
  'CONFIRM_DETAILS',
  'PROVIDE_INFO',
] as const;
export type SuggestedAction = (typeof SUGGESTED_ACTIONS)[number];

export interface SafetyInterpretation {
  intent: SafetyIntent;
  severity: SafetySeverity;
  confidence: number;
  reply: string;
  suggestedAction: SuggestedAction;
  requiresConfirmation: true;
  language: string;
  provider: string;
  mode: 'console' | 'live';
  simulated: boolean;
  degraded: boolean;
  providerError?: string;
  at: string;
}

export class AiProviderError extends Error {
  readonly code: 'GNANI_NOT_CONFIGURED' | 'GNANI_UNAVAILABLE' | 'GNANI_BAD_RESPONSE';

  constructor(
    code: 'GNANI_NOT_CONFIGURED' | 'GNANI_UNAVAILABLE' | 'GNANI_BAD_RESPONSE',
    message: string,
  ) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
  }
}

export function gnaniConfigured(): boolean {
  return Boolean(env.GNANI_API_KEY.trim() && env.GNANI_API_URL.trim());
}

interface Rule {
  intent: SafetyIntent;
  severity: SafetySeverity;
  action: SuggestedAction;
  confidence: number;
  keywords: string[];
  reply: string;
}

/**
 * Ordered rules: the first match wins. The most dangerous language is checked
 * first so "accident hua, bachao" is treated as an SOS rather than transport.
 */
const RULES: Rule[] = [
  {
    intent: 'SOS',
    severity: 'CRITICAL',
    action: 'CALL_112',
    confidence: 0.92,
    keywords: [
      'bachao',
      'bachaao',
      'bachaiye',
      'sos',
      'jaan ka khatra',
      'jaan ko khatra',
      'maar raha',
      'maar rahi',
      'attack',
      'hamla',
      'kidnap',
      'abduct',
      'rape',
      'balatkar',
      'acid',
      'chaku',
      'gun',
      'help me',
      'emergency',
      'save me',
    ],
    reply:
      'Aapki safety sabse pehle hai. Agar jaan ka khatra hai to turant 112 par call kijiye. SOS button 3 second dabaye rakhiye taaki aapke trusted contacts alert ho saken. Main emergency services ko apne aap alert nahi kar sakti.',
  },
  {
    intent: 'ACCIDENT',
    severity: 'HIGH',
    action: 'CALL_112',
    confidence: 0.86,
    keywords: [
      'accident',
      'takkar',
      'collision',
      'road accident',
      'bike gir',
      'gaadi gir',
      'khoon',
      'bleeding',
      'injured',
      'chot lag',
      'hospital',
      'unconscious',
    ],
    reply:
      'Yahan accident lagta hai. Agar kisi ko chot lagi hai to turant 112 par call kijiye aur SOS button dabaye rakhiye. Jitna safe ho, vehicle ke aas-paas logon se madad maangiye.',
  },
  {
    intent: 'UNSAFE_CAB',
    severity: 'HIGH',
    action: 'SHARE_LOCATION',
    confidence: 0.84,
    keywords: [
      'cab',
      'taxi',
      'ola',
      'uber',
      'driver',
      'gaadi',
      'car',
      'auto',
      'raasta galat',
      'raste se',
      'route',
      'shortcut',
    ],
    reply:
      'Cab unsafe lag rahi hai to driver ko turant rokne ke liye kahen, kisi bheed wali jagah par utriye, aur kisi trusted contact ko live location bhejiye. Zarurat lage to 112 par call kijiye.',
  },
  {
    intent: 'CHILD_UNSAFE',
    severity: 'HIGH',
    action: 'ALERT_TRUSTED_CONTACTS',
    confidence: 0.87,
    keywords: [
      'bachcha',
      'bacche',
      'bachche',
      'child',
      'baby',
      'school',
      'teacher',
      'bache ko',
      'bacche ko',
      'bachche ko',
    ],
    reply:
      'Bachche ki safety ke liye turant uske paas kisi bharosemand insaan ko bhejiye. Guardian link se alert kijiye aur 112 par call kijiye agar khatra turant hai. Main madad ke liye yahan hoon, lekin emergency services ko apne aap alert nahi kar sakti.',
  },
  {
    intent: 'FOLLOWED',
    severity: 'HIGH',
    action: 'HOLD_SOS',
    confidence: 0.88,
    keywords: [
      'follow',
      'following',
      'peeche',
      'pichhe',
      'pichha',
      'peecha',
      'stalk',
      'track kar',
    ],
    reply:
      'Aapko koi follow kar raha hai to bheed wali jagah, khuli dukaan ya kisi bharosemand ke paas chaliye. 112 par call kijiye aur SOS button dabaye rakhiye. Trusted contact ko turant location bhejiye.',
  },
  {
    intent: 'HOME_UNSAFE',
    severity: 'HIGH',
    action: 'HOLD_SOS',
    confidence: 0.83,
    keywords: [
      'ghar',
      'darwaza',
      'door',
      'akeli',
      'akela',
      'alone',
      'bahar log',
      'bahar kuch log',
      'khatkhat',
      'toot',
      'intruder',
    ],
    reply:
      'Ghar par khatra lagta hai to darwaza lock rakhiye, shor machaiye, aur 112 par call kijiye. Kisi trusted contact ko call ya message kijiye. Main aapki jagah police ko nahi bhej sakti.',
  },
  {
    intent: 'HARASSMENT',
    severity: 'MEDIUM',
    action: 'ALERT_TRUSTED_CONTACTS',
    confidence: 0.8,
    keywords: [
      'pareshan',
      'preshan',
      'chhed',
      'chheda',
      'harass',
      'harassment',
      'galat baat',
      'galat message',
      'touch',
      'abuse',
      'gali',
      'threat',
      'dhamki',
    ],
    reply:
      'Yeh harassment lagta hai aur aapko safe feel karne ka poora haq hai. Kisi trusted contact ko bataiye, messages/screenshots save rakhiye, aur zarurat pade to 112 par call kijiye. Aap akele nahi hain.',
  },
  {
    intent: 'NEEDS_HELP',
    severity: 'MEDIUM',
    action: 'CONFIRM_DETAILS',
    confidence: 0.64,
    keywords: [
      'dar',
      'darr',
      'darr lag',
      'scared',
      'unsafe',
      'khatra',
      'help',
      'madad',
      'problem',
      'trouble',
      'pareshani',
    ],
    reply:
      'Main samajh rahi hoon ki aapko dar lag raha hai. Thoda aur bataiye kya ho raha hai aur aap kahan hain. Agar turant khatra hai to 112 par call kijiye ya SOS button dabaye rakhiye.',
  },
];

const INFO_KEYWORDS = [
  'hello',
  'hi',
  'namaste',
  'hey',
  'kya kar',
  'kaise',
  'how',
  'what',
  'information',
  'info',
  'app',
  'suraksha',
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Short tokens need word boundaries so "scared" does not match "car". */
function matchesKeyword(value: string, keyword: string): boolean {
  if (keyword.length <= 4 && !keyword.includes(' ')) {
    return new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(value);
  }
  return value.includes(keyword);
}

function infoReply(): string {
  return 'Main SURAKSHA AI ki safety assistant hoon. Aap apni situation Hinglish me likh sakti hain. Main emergency services ko apne aap alert nahi kar sakti — turant khatra ho to 112 par call kijiye ya SOS button dabaye rakhiye.';
}

/** Deterministic local classifier used in console mode and as a safe fallback. */
export function classifySafetyText(text: string): Pick<
  SafetyInterpretation,
  'intent' | 'severity' | 'confidence' | 'reply' | 'suggestedAction'
> {
  const value = normalize(text);

  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => matchesKeyword(value, keyword))) {
      return {
        intent: rule.intent,
        severity: rule.severity,
        confidence: rule.confidence,
        reply: rule.reply,
        suggestedAction: rule.action,
      };
    }
  }

  if (INFO_KEYWORDS.some((keyword) => matchesKeyword(value, keyword))) {
    return {
      intent: 'INFO',
      severity: 'LOW',
      confidence: 0.58,
      reply: infoReply(),
      suggestedAction: 'PROVIDE_INFO',
    };
  }

  return {
    intent: 'UNKNOWN',
    severity: 'LOW',
    confidence: 0.35,
    reply:
      'Main poori baat samajh nahi paayi. Kripya batayiye kya ho raha hai aur aap kahan hain. Turant khatra ho to 112 par call kijiye ya SOS button dabaye rakhiye.',
    suggestedAction: 'CONFIRM_DETAILS',
  };
}

function normalizeIntent(value: unknown): SafetyIntent | null {
  if (typeof value !== 'string') return null;
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, SafetyIntent> = {
    EMERGENCY: 'SOS',
    ATTACK: 'SOS',
    VIOLENCE: 'SOS',
    DANGER: 'SOS',
    FOLLOWING: 'FOLLOWED',
    STALKING: 'FOLLOWED',
    CAB: 'UNSAFE_CAB',
    UNSAFE_TAXI: 'UNSAFE_CAB',
    TRANSPORT: 'UNSAFE_CAB',
    MEDICAL: 'ACCIDENT',
    INJURY: 'ACCIDENT',
    HOME: 'HOME_UNSAFE',
    DOMESTIC: 'HOME_UNSAFE',
    CHILD: 'CHILD_UNSAFE',
    ABUSE: 'HARASSMENT',
    SAFE: 'INFO',
    GREETING: 'INFO',
    OTHER: 'UNKNOWN',
  };
  if ((SAFETY_INTENTS as readonly string[]).includes(key)) return key as SafetyIntent;
  return aliases[key] ?? null;
}

function normalizeSeverity(value: unknown): SafetySeverity | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 4) return 'CRITICAL';
    if (value >= 3) return 'HIGH';
    if (value >= 2) return 'MEDIUM';
    return 'LOW';
  }
  if (typeof value !== 'string') return null;
  const key = value.trim().toUpperCase();
  return (SAFETY_SEVERITIES as readonly string[]).includes(key)
    ? (key as SafetySeverity)
    : null;
}

export interface GnaniRawResponse {
  intent?: unknown;
  severity?: unknown;
  confidence?: unknown;
  reply?: unknown;
  response?: unknown;
  answer?: unknown;
  text?: unknown;
  suggested_action?: unknown;
  suggestedAction?: unknown;
}

/**
 * Parse the adapter's expected Gnani response. The live contract is not
 * verified in this repository (no credentials), so unknown fields fall back to
 * the local classifier instead of inventing an answer.
 */
export function parseGnaniResponse(
  raw: GnaniRawResponse,
  fallback: ReturnType<typeof classifySafetyText>,
): Pick<
  SafetyInterpretation,
  'intent' | 'severity' | 'confidence' | 'reply' | 'suggestedAction'
> {
  const replyCandidates = [raw.reply, raw.response, raw.answer, raw.text];
  const reply = replyCandidates.find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );

  const rawConfidence = raw.confidence;
  const confidence =
    typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)
      ? Math.min(1, Math.max(0, rawConfidence > 1 ? rawConfidence / 100 : rawConfidence))
      : fallback.confidence;

  const action = raw.suggested_action ?? raw.suggestedAction;
  const suggestedAction = (SUGGESTED_ACTIONS as readonly string[]).includes(String(action))
    ? (action as SuggestedAction)
    : fallback.suggestedAction;

  return {
    intent: normalizeIntent(raw.intent) ?? fallback.intent,
    severity: normalizeSeverity(raw.severity) ?? fallback.severity,
    confidence,
    reply: reply?.trim() ?? fallback.reply,
    suggestedAction,
  };
}

async function callGnani(
  text: string,
  language: string,
): Promise<GnaniRawResponse> {
  if (!gnaniConfigured()) {
    throw new AiProviderError('GNANI_NOT_CONFIGURED', 'Gnani is not configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.GNANI_TIMEOUT_MS);
  try {
    const response = await fetch(env.GNANI_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.GNANI_API_KEY}`,
        'x-api-key': env.GNANI_API_KEY,
      },
      body: JSON.stringify({
        text,
        language: language === 'auto' ? env.GNANI_LANGUAGE : language,
        session_id: `suraksha-${randomUUID()}`,
        context: {
          product: 'SURAKSHA AI',
          purpose: 'women_and_child_safety',
          response_language: 'hinglish',
          must_not_claim_dispatch: true,
          must_not_create_incident: true,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AiProviderError(
        'GNANI_UNAVAILABLE',
        `Gnani returned HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as GnaniRawResponse;
    if (!data || typeof data !== 'object') {
      throw new AiProviderError('GNANI_BAD_RESPONSE', 'Gnani returned a non-object body');
    }
    return data;
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if ((error as { name?: string }).name === 'AbortError') {
      throw new AiProviderError('GNANI_UNAVAILABLE', 'Gnani request timed out');
    }
    throw new AiProviderError('GNANI_UNAVAILABLE', 'Gnani request failed');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Interpret a safety message. Provider failures fall back to the local
 * classifier with `degraded: true` — the caller must surface that, never
 * pretend Gnani answered.
 */
export async function interpretSafetyText(input: {
  text: string;
  language?: string;
}): Promise<SafetyInterpretation> {
  const local = classifySafetyText(input.text);
  const language = input.language ?? (env.GNANI_LANGUAGE || 'auto');
  const base = {
    requiresConfirmation: true as const,
    language,
    at: new Date().toISOString(),
  };

  if (env.aiMode !== 'live') {
    return {
      ...local,
      ...base,
      provider: 'console',
      mode: 'console',
      simulated: true,
      degraded: false,
    };
  }

  if (!gnaniConfigured()) {
    return {
      ...local,
      ...base,
      provider: 'console-fallback',
      mode: 'live',
      simulated: true,
      degraded: true,
      providerError: 'GNANI_NOT_CONFIGURED',
    };
  }

  try {
    const raw = await callGnani(input.text, language);
    return {
      ...parseGnaniResponse(raw, local),
      ...base,
      provider: 'gnani',
      mode: 'live',
      simulated: false,
      degraded: false,
    };
  } catch (error) {
    const code =
      error instanceof AiProviderError ? error.code : 'GNANI_UNAVAILABLE';
    return {
      ...local,
      ...base,
      provider: 'console-fallback',
      mode: 'live',
      simulated: true,
      degraded: true,
      providerError: code,
    };
  }
}

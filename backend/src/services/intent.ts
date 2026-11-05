import { z } from 'zod';

/**
 * Validated safety-intent engine.
 *
 * Gnani Prisma v3.0 is a speech-to-text model: it returns a transcript, not an
 * intent. Intent classification therefore happens here, deterministically, and
 * its output is validated with Zod before it reaches a client. No provider is
 * allowed to invent an intent field.
 */

export const SAFETY_INTENTS = [
  'EMERGENCY_SOS',
  'SHARE_LOCATION',
  'START_JOURNEY',
  'CHECK_IN',
  'CALL_CONTACT',
  'CANCEL_SOS',
  'GENERAL_HELP',
  'UNKNOWN',
] as const;
export type SafetyIntent = (typeof SAFETY_INTENTS)[number];

export const SAFETY_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type SafetySeverity = (typeof SAFETY_SEVERITIES)[number];

export const SAFETY_ACTIONS = [
  'OPEN_SOS',
  'SHARE_LOCATION',
  'START_JOURNEY',
  'CHECK_IN',
  'CALL_CONTACT',
  'CANCEL_SOS',
  'NONE',
] as const;
export type SafetyAction = (typeof SAFETY_ACTIONS)[number];

export const SUPPORTED_LANGUAGE_CODES = [
  'indic-auto',
  'hi-IN',
  'en-IN',
  'mr-IN',
  'bn-IN',
  'gu-IN',
  'kn-IN',
  'ml-IN',
  'pa-IN',
  'ta-IN',
  'te-IN',
] as const;
export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

/** Below this the result is treated as ambiguous and must be confirmed. */
export const CONFIDENCE_ACTIONABLE = 0.75;
/** Below this we return UNKNOWN unless distress evidence exists. */
export const CONFIDENCE_MINIMUM = 0.45;

export const interpretationSchema = z.object({
  intent: z.enum(SAFETY_INTENTS),
  severity: z.enum(SAFETY_SEVERITIES),
  confidence: z.number().min(0).max(1),
  reply: z.string().min(1).max(700),
  action: z.enum(SAFETY_ACTIONS),
  ambiguous: z.boolean(),
  requiresConfirmation: z.boolean(),
  language: z.string().min(2).max(24),
  provider: z.literal('local-intent'),
  mode: z.literal('local'),
  simulated: z.literal(false),
  degraded: z.boolean(),
  providerError: z.string().optional(),
  transcript: z.string().max(2000).optional(),
  detectedLanguageCode: z.string().max(24).optional(),
  at: z.string().datetime(),
});
export type SafetyInterpretation = z.infer<typeof interpretationSchema>;

interface IntentRule {
  intent: SafetyIntent;
  severity: SafetySeverity;
  action: SafetyAction;
  confidence: number;
  keywords: string[];
  reply: string;
}

/**
 * Rules are scored rather than first-match so a sentence that mentions both
 * "location" and "someone is following me" still resolves to the emergency.
 */
const RULES: IntentRule[] = [
  {
    intent: 'CANCEL_SOS',
    severity: 'LOW',
    action: 'CANCEL_SOS',
    confidence: 0.9,
    keywords: [
      'cancel sos',
      'cancel the sos',
      'cancel alert',
      'cancel my alert',
      'stop sos',
      'sos cancel',
      'sos band',
      'sos roko',
      'sos radd',
      'sos रद्द',
      'एसओएस रद्द',
      'अलर्ट रद्द',
      'रद्द करा',
      'रद्द कर',
      'cancel कर',
    ],
    reply:
      'Agar aap safe hain aur SOS cancel karna chahti hain, to confirm kijiye. Cancel karne par aapke trusted contacts ko bataya jayega ki madad ki zarurat nahi hai. Main apne aap koi alert cancel nahi karungi.',
  },
  {
    intent: 'EMERGENCY_SOS',
    severity: 'CRITICAL',
    action: 'OPEN_SOS',
    confidence: 0.9,
    keywords: [
      'bachao',
      'bachaao',
      'bachaiye',
      'बचाओ',
      'वाचवा',
      'help me',
      'save me',
      'emergency',
      'sos',
      'jaan ka khatra',
      'jaan ko khatra',
      'जान का खतरा',
      'maar raha',
      'maar rahi',
      'मार रहा',
      'मार रही',
      'attack',
      'hamla',
      'हमला',
      'kidnap',
      'abduct',
      'rape',
      'balatkar',
      'acid',
      'chaku',
      'चाकू',
      'gun',
      'bandook',
      'follow',
      'following',
      'peeche',
      'pichhe',
      'pichha',
      'peecha',
      'पीछे',
      'मागे',
      'stalk',
      'threat',
      'dhamki',
      'धमकी',
      'khatra',
      'खतरा',
      'धोका',
      'unsafe',
      'असुरक्षित',
      'accident',
      'takkar',
      'अपघात',
      'khoon',
      'रक्त',
      'bleeding',
      'injured',
      'जखमी',
      'police',
      'पोलीस',
      'पुलिस',
      '112',
    ],
    reply:
      'Aapki safety sabse pehle hai. Agar turant khatra hai to 112 par call kijiye aur Home screen par SOS button 3 second dabaye rakhiye. Main emergency services ko apne aap alert nahi kar sakti; SOS bhejne se pehle aapki confirmation lagegi.',
  },
  {
    intent: 'SHARE_LOCATION',
    severity: 'MEDIUM',
    action: 'SHARE_LOCATION',
    confidence: 0.86,
    keywords: [
      'share my location',
      'share location',
      'send my location',
      'send location',
      'location share',
      'location bhejo',
      'location bhej',
      'meri location',
      'मेरी लोकेशन',
      'लोकेशन भेज',
      'माझी जागा',
      'जागा पाठवा',
      'live location',
    ],
    reply:
      'Location share karne ke liye confirm kijiye. Live location alert ke dauraan trusted contacts ke saath share hoti hai. Main bina aapki confirmation ke location nahi bhejungi.',
  },
  {
    intent: 'START_JOURNEY',
    severity: 'LOW',
    action: 'START_JOURNEY',
    confidence: 0.82,
    keywords: [
      'start journey',
      'start my journey',
      'start trip',
      'share my trip',
      'safar shuru',
      'yatra shuru',
      'प्रवास सुरू',
      'journey start',
      'trip start',
      'ghar ja rahi',
      'ghar ja raha',
      'ghar jaana',
      'ghar jana',
      'mujhe ghar jaana',
      'घर जात',
      'घर जाना',
      'घरला जात',
    ],
    reply:
      'Journey tracking abhi is version me poora nahi hai. Aap SOS ya live location share use kar sakti hain. Main journey apne aap start nahi karungi; aapko confirm karna hoga.',
  },
  {
    intent: 'CHECK_IN',
    severity: 'LOW',
    action: 'CHECK_IN',
    confidence: 0.8,
    keywords: [
      'i am safe',
      'i am okay',
      'im safe',
      'check in',
      'check-in',
      'main safe hoon',
      'main theek hoon',
      'sab theek hai',
      'मैं सुरक्षित हूँ',
      'मी सुरक्षित आहे',
      'मी ठीक आहे',
      'safe hoon',
    ],
    reply:
      'Aapne bataya ki aap safe hain. Check-in confirm kijiye taaki aapka status update ho. Agar situation badle to turant SOS dabaye rakhiye.',
  },
  {
    intent: 'CALL_CONTACT',
    severity: 'MEDIUM',
    action: 'CALL_CONTACT',
    confidence: 0.84,
    keywords: [
      'call my mother',
      'call my mom',
      'call my father',
      'call my dad',
      'call my sister',
      'call my brother',
      'call my friend',
      'call my husband',
      'call my wife',
      'call contact',
      'call someone',
      'mummy ko call',
      'papa ko call',
      'maa ko call',
      'mummy ko phone',
      'आईला कॉल',
      'बाबांना कॉल',
      'मम्मी को कॉल',
      'पापा को कॉल',
      'contact ko call',
    ],
    reply:
      'Aap apne trusted contact ko call kar sakti hain. Contacts screen se number kholiye. Main apne aap kisi ko call nahi karungi; dialer aap kholenge.',
  },
  {
    intent: 'GENERAL_HELP',
    severity: 'LOW',
    action: 'NONE',
    confidence: 0.7,
    keywords: [
      'how does this work',
      'what can you do',
      'help',
      'madad',
      'मदद',
      'मदत',
      'information',
      'info',
      'kaise kaam',
      'kya kar sakti',
      'app',
      'suraksha',
      'hello',
      'namaste',
      'नमस्ते',
      'नमस्कार',
    ],
    reply:
      'Main SURAKSHA AI ki safety assistant hoon. Aap Hindi, English, Marathi ya Hinglish me bol sakti hain. Main aapki baat samajhkar guidance deti hoon, lekin emergency services ko apne aap alert nahi kar sakti. Turant khatra ho to 112 par call kijiye ya SOS dabaye rakhiye.',
  },
];

/**
 * Distress vocabulary. If the classifier has low confidence but these appear,
 * the request is still escalated to a confirmation prompt rather than dropped.
 */
const DISTRESS_MARKERS = [
  'dar',
  'darr',
  'scared',
  'afraid',
  'help',
  'madad',
  'मदद',
  'मदत',
  'khatra',
  'खतरा',
  'धोका',
  'unsafe',
  'असुरक्षित',
  'trouble',
  'problem',
  'pareshan',
  'pareshani',
  'परेशान',
  'अडचण',
  'alone',
  'akeli',
  'akela',
  'अकेली',
  'एकटी',
];

const DEVANAGARI = /[\u0900-\u097F]/;
const LATIN = /[A-Za-z]/;

/**
 * Markers that are distinctive to Marathi. Words shared with Hindi
 * ("सुरक्षित", "कॉल", "मदद") are deliberately excluded so a Hindi sentence is
 * not mislabelled as Marathi.
 */
const MARATHI_MARKERS = [
  'आहे',
  'मला',
  'माझी',
  'माझ्या',
  'तुम्ही',
  'कृपया',
  'मदत',
  'धोका',
  'पाठवा',
  'रद्द',
  'हवी',
  'हवा',
  'जात आहे',
  'येत आहे',
];

const HINGLISH_MARKERS = [
  'hai',
  'hoon',
  'nahi',
  'nahin',
  'kya',
  'mujhe',
  'mera',
  'meri',
  'koi',
  'bachao',
  'madad',
  'ghar',
  'jaana',
  'ja raha',
  'ja rahi',
  'chahiye',
  'raha',
  'rahi',
  'pareshan',
  'khatra',
  'jaldi',
  'abhi',
  'bhejo',
  'karo',
  'kijiye',
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesKeyword(value: string, keyword: string): boolean {
  const needle = keyword.toLowerCase();
  // Short Latin tokens need boundaries so "gun" does not match "begun".
  if (needle.length <= 4 && !needle.includes(' ') && !DEVANAGARI.test(needle)) {
    return new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(value);
  }
  return value.includes(needle);
}

function scoreRule(value: string, rule: IntentRule): number {
  const hits = rule.keywords.filter((keyword) => matchesKeyword(value, keyword)).length;
  if (hits === 0) return 0;
  return Math.min(0.98, rule.confidence + (hits - 1) * 0.03);
}

function hasDistress(value: string): boolean {
  return DISTRESS_MARKERS.some((marker) => matchesKeyword(value, marker));
}

/** Script/language hint used when the caller has no STT metadata. */
export function detectLanguage(text: string): string {
  const value = normalize(text);
  const devanagari = DEVANAGARI.test(value);
  const latin = LATIN.test(value);

  if (devanagari && latin) return 'hi-IN+en-IN';
  if (devanagari) {
    return MARATHI_MARKERS.some((marker) => value.includes(marker)) ? 'mr-IN' : 'hi-IN';
  }
  if (HINGLISH_MARKERS.some((marker) => matchesKeyword(value, marker))) {
    return 'hi-IN+en-IN';
  }
  return 'en-IN';
}

function replyForAmbiguous(intent: SafetyIntent, baseReply: string): string {
  if (intent === 'EMERGENCY_SOS') {
    return `${baseReply} Agar aapki baat theek se samajh nahi aayi, phir bhi turant khatra ho to 112 par call kijiye ya SOS dabaye rakhiye.`;
  }
  return `Main poori tarah samajh nahi paayi. Kripya thoda aur batayiye kya ho raha hai. ${baseReply}`;
}

export interface ClassifyOptions {
  language?: string;
  transcript?: string;
  detectedLanguageCode?: string;
}

/**
 * Deterministic, multilingual intent classifier. The output is always parsed
 * through `interpretationSchema`, so a future provider cannot smuggle an
 * invalid intent or confidence into the API.
 */
export function classifySafetyText(
  text: string,
  options: ClassifyOptions = {},
): SafetyInterpretation {
  const value = normalize(text);

  let best: { rule: IntentRule; score: number } | null = null;
  for (const rule of RULES) {
    const score = scoreRule(value, rule);
    if (score > (best?.score ?? 0)) best = { rule, score };
  }

  let intent: SafetyIntent;
  let severity: SafetySeverity;
  let action: SafetyAction;
  let confidence: number;
  let reply: string;

  if (best) {
    ({ intent, severity, action, confidence, reply } = best.rule);
    confidence = best.score;
  } else if (hasDistress(value)) {
    // Possible distress is never silently discarded.
    intent = 'EMERGENCY_SOS';
    severity = 'HIGH';
    action = 'OPEN_SOS';
    confidence = 0.5;
    reply =
      'Aapki baat me khatre ka ishara lag raha hai. Agar aap unsafe hain to turant 112 par call kijiye ya SOS button dabaye rakhiye. Main bina aapki confirmation ke koi alert nahi bhejungi.';
  } else {
    intent = 'UNKNOWN';
    severity = 'LOW';
    action = 'NONE';
    confidence = 0.2;
    reply =
      'Main poori baat samajh nahi paayi. Kripya batayiye kya ho raha hai aur aap kahan hain. Turant khatra ho to 112 par call kijiye ya SOS button dabaye rakhiye.';
  }

  const ambiguous = confidence < CONFIDENCE_ACTIONABLE;
  if (ambiguous) reply = replyForAmbiguous(intent, reply);

  const language =
    options.language && options.language !== 'auto'
      ? options.language
      : options.detectedLanguageCode && options.detectedLanguageCode !== 'unknown'
        ? options.detectedLanguageCode
        : detectLanguage(text);

  return interpretationSchema.parse({
    intent,
    severity,
    confidence: Math.round(confidence * 100) / 100,
    reply,
    action,
    ambiguous,
    // Emergency guidance and every real action stay user-confirmed.
    requiresConfirmation: intent !== 'UNKNOWN' && intent !== 'GENERAL_HELP',
    language,
    provider: 'local-intent',
    mode: 'local',
    simulated: false,
    degraded: false,
    transcript: options.transcript ?? text,
    ...(options.detectedLanguageCode
      ? { detectedLanguageCode: options.detectedLanguageCode }
      : {}),
    at: new Date().toISOString(),
  });
}

/**
 * Validate an interpretation produced anywhere else (for example a future
 * server-side language model). Invalid output is rejected, never coerced.
 */
export function parseInterpretation(raw: unknown): SafetyInterpretation {
  return interpretationSchema.parse(raw);
}

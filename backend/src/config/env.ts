import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment contract. Fails fast at boot when something essential is
 * missing — better a clear error than a half-working emergency backend.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/suraksha_ai'),

  JWT_ACCESS_SECRET: z.string().min(8).default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(8).default('dev-refresh-secret-change-me'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174,http://localhost:8081'),

  /**
   * Gnani Prisma v3.0 Speech-to-Text. The API key is sent as `X-API-Key-ID`
   * (verified against https://docs.gnani.ai/api/STT/speech-to-text).
   */
  GNANI_API_KEY: z.string().optional().default(''),
  GNANI_STT_URL: z
    .string()
    .url()
    .default('https://api.vachana.ai/stt/v3'),
  GNANI_STT_MODEL: z.enum(['prisma-v3.0', 'prisma-v2.5']).default('prisma-v3.0'),
  /** indic-auto lets Prisma v3.0 detect the spoken language. */
  GNANI_STT_LANGUAGE: z.string().default('indic-auto'),
  /** codemix keeps English words in Latin script, which suits Hinglish. */
  GNANI_STT_FORMAT: z
    .enum(['verbatim', 'transcribe', 'codemix', 'transliterate'])
    .default('codemix'),
  GNANI_TIMEOUT_MS: z.coerce.number().int().positive().max(60_000).default(20_000),
  AI_PROVIDER: z.string().default('gnani'),
  /** console = local intent only (dev/test), live = enable Gnani STT. */
  AI_MODE: z.enum(['console', 'live']).optional(),

  SMS_PROVIDER: z.string().optional().default(''),
  SMS_API_KEY: z.string().optional().default(''),
  SMS_API_URL: z.string().optional().default(''),
  SMS_FROM: z.string().optional().default(''),
  WHATSAPP_PROVIDER: z.string().optional().default(''),
  WHATSAPP_API_KEY: z.string().optional().default(''),
  WHATSAPP_API_URL: z.string().optional().default(''),
  PUSH_PROVIDER: z.string().optional().default(''),
  PUSH_API_KEY: z.string().optional().default(''),
  PUSH_API_URL: z.string().optional().default(''),

  /** console = explicit dev simulation, live = call configured providers. */
  NOTIFICATION_MODE: z.enum(['console', 'live']).optional(),
  /** HMAC secret for provider delivery webhooks. */
  NOTIFICATION_WEBHOOK_SECRET: z.string().optional().default(''),

  /** Escalate untouched alerts after this many seconds. */
  ESCALATION_AFTER_SECONDS: z.coerce.number().int().positive().default(120),
  /** A location captured longer ago than this is stored as stale. */
  LOCATION_STALE_AFTER_SECONDS: z.coerce.number().int().positive().default(120),

  OTP_MODE: z.enum(['console', 'provider']).default('console'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const isProd = parsed.data.NODE_ENV === 'production';
const isTest = parsed.data.NODE_ENV === 'test';
const aiMode = parsed.data.AI_MODE ?? (isProd ? 'live' : 'console');

/**
 * Fail fast when live speech-to-text is requested without credentials. Secrets
 * are never logged; only the missing variable names are reported.
 */
if (aiMode === 'live' && !parsed.data.GNANI_API_KEY.trim()) {
  // eslint-disable-next-line no-console
  console.error(
    '[config] AI_MODE=live requires GNANI_API_KEY. Set it in backend/.env ' +
      '(never commit that file) or run with AI_MODE=console for local intent only.',
  );
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  isProd,
  isTest,
  /** Dev/test default is a clearly-labelled simulation, not a silent fake send. */
  notificationMode: parsed.data.NOTIFICATION_MODE ?? (isProd ? 'live' : 'console'),
  /** No Gnani credentials in dev => local intent only, clearly labelled. */
  aiMode,
};

export type Env = typeof env;

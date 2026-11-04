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

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),

  GNANI_API_KEY: z.string().optional().default(''),
  GNANI_API_URL: z.string().optional().default(''),
  GNANI_LANGUAGE: z.string().default('auto'),
  AI_PROVIDER: z.string().default('gnani'),

  SMS_PROVIDER: z.string().optional().default(''),
  SMS_API_KEY: z.string().optional().default(''),
  WHATSAPP_PROVIDER: z.string().optional().default(''),
  WHATSAPP_API_KEY: z.string().optional().default(''),
  PUSH_PROVIDER: z.string().optional().default(''),
  PUSH_API_KEY: z.string().optional().default(''),

  OTP_MODE: z.enum(['console', 'provider']).default('console'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
};

export type Env = typeof env;

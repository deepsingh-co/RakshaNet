import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { SUPPORTED_LANGUAGE_CODES } from './intent.js';

/**
 * Gnani Prisma v3.0 Speech-to-Text client.
 *
 * Contract verified against:
 *   https://docs.gnani.ai/api/STT/speech-to-text
 *   https://docs.gnani.ai/api/STT/models/prisma-v3
 *
 * REST endpoint: POST https://api.vachana.ai/stt/v3
 * Auth header:   X-API-Key-ID
 * Body:          multipart/form-data (audio_file, model, language_code, format)
 *
 * This module only transcribes. It never creates incidents and never dispatches
 * emergency services.
 */

export const GNANI_STT_ENDPOINT = 'https://api.vachana.ai/stt/v3';
export const GNANI_STT_MODEL = 'prisma-v3.0';
export const GNANI_MAX_AUDIO_SECONDS = 30;
export const GNANI_MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export const GNANI_AUDIO_FORMATS = ['WAV', 'MP3', 'OGG', 'FLAC', 'AAC', 'M4A'] as const;

export type GnaniSttErrorCode =
  | 'GNANI_NOT_CONFIGURED'
  | 'GNANI_AUTH_FAILED'
  | 'GNANI_SCOPE_NOT_ALLOWED'
  | 'GNANI_INSUFFICIENT_CREDIT'
  | 'GNANI_RATE_LIMITED'
  | 'GNANI_TIMEOUT'
  | 'GNANI_UNSUPPORTED_AUDIO'
  | 'GNANI_UNSUPPORTED_LANGUAGE'
  | 'GNANI_BAD_RESPONSE'
  | 'GNANI_UNAVAILABLE';

export class GnaniSttError extends Error {
  readonly code: GnaniSttErrorCode;
  readonly providerStatus: number | null;
  readonly providerType: string | null;

  constructor(
    code: GnaniSttErrorCode,
    message: string,
    options: { providerStatus?: number; providerType?: string } = {},
  ) {
    super(message);
    this.name = 'GnaniSttError';
    this.code = code;
    this.providerStatus = options.providerStatus ?? null;
    this.providerType = options.providerType ?? null;
  }
}

export interface GnaniSttConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  defaultLanguage: string;
  format: string;
  timeoutMs: number;
}

export function gnaniSttConfigFromEnv(overrides: Partial<GnaniSttConfig> = {}): GnaniSttConfig {
  return {
    apiKey: env.GNANI_API_KEY,
    endpoint: env.GNANI_STT_URL,
    model: env.GNANI_STT_MODEL,
    defaultLanguage: env.GNANI_STT_LANGUAGE,
    format: env.GNANI_STT_FORMAT,
    timeoutMs: env.GNANI_TIMEOUT_MS,
    ...overrides,
  };
}

export function gnaniSttConfigured(
  config: Pick<GnaniSttConfig, 'apiKey' | 'endpoint'> = gnaniSttConfigFromEnv(),
): boolean {
  return Boolean(config.apiKey.trim() && config.endpoint.trim());
}

export interface GnaniTranscription {
  provider: 'gnani';
  model: string;
  requestId: string;
  transcript: string;
  detectedLanguageCode: string | null;
  processingTime: number | null;
  endToEndLatency: number | null;
  truncated: boolean;
  simulated: false;
}

export interface TranscribeAudioInput {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
  languageCode?: string;
  format?: string;
  /** Extra context accepted by Prisma v3.0. Keep short and non-PII. */
  topic?: string;
}

const successSchema = z
  .object({
    success: z.literal(true),
    request_id: z.string().min(1),
    // Empty transcript is explicitly a valid success response in the contract.
    transcript: z.string(),
    model: z.string().min(1).optional(),
    detected_language_code: z.string().min(1).optional(),
    processing_time: z.number().finite().nonnegative().optional(),
    end_to_end_latency: z.number().finite().nonnegative().optional(),
    truncated: z.boolean().optional(),
  })
  .passthrough();

const standardErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      type: z.string().min(1),
      message: z.string().min(1),
    }),
  })
  .passthrough();

const detailErrorSchema = z
  .object({
    detail: z.object({
      error_code: z.string().min(1),
      message: z.string().min(1),
      status_code: z.number().optional(),
    }),
  })
  .passthrough();

const gatewayErrorSchema = z
  .object({
    error: z.string(),
    code: z.string().min(1),
    message: z.string().min(1),
  })
  .passthrough();

const validationErrorSchema = z.object({ detail: z.array(z.unknown()) }).passthrough();

function errorCodeFor(status: number, providerType: string | null): GnaniSttErrorCode {
  if (status === 401) return 'GNANI_AUTH_FAILED';
  if (status === 402) return 'GNANI_INSUFFICIENT_CREDIT';
  if (status === 403) return 'GNANI_SCOPE_NOT_ALLOWED';
  if (status === 429) return 'GNANI_RATE_LIMITED';
  if (status === 504) return 'GNANI_TIMEOUT';

  switch (providerType) {
    case 'UNSUPPORTED_AUDIO_FORMAT':
    case 'AUDIO_CONVERSION_ERROR':
    case 'EMPTY_AUDIO':
    case 'MAX_AUDIO_DURATION_EXCEEDED':
      return 'GNANI_UNSUPPORTED_AUDIO';
    case 'INVALID_LANGUAGE_CODE':
    case 'MODEL_UNSUPPORTED_LANGUAGE':
      return 'GNANI_UNSUPPORTED_LANGUAGE';
    case 'UPSTREAM_TIMEOUT':
      return 'GNANI_TIMEOUT';
    case 'RATE_LIMITED':
      return 'GNANI_RATE_LIMITED';
    default:
      return status >= 500 ? 'GNANI_UNAVAILABLE' : 'GNANI_BAD_RESPONSE';
  }
}

/**
 * Parse and validate a Gnani REST response. Both the documented success shape
 * and the three documented error envelopes are handled explicitly.
 */
export function parseGnaniSttResponse(status: number, body: unknown): GnaniTranscription {
  const success = successSchema.safeParse(body);
  if (status >= 200 && status < 300 && success.success) {
    const data = success.data;
    return {
      provider: 'gnani',
      model: data.model ?? GNANI_STT_MODEL,
      requestId: data.request_id,
      transcript: data.transcript,
      detectedLanguageCode: data.detected_language_code ?? null,
      processingTime: data.processing_time ?? null,
      endToEndLatency: data.end_to_end_latency ?? null,
      truncated: data.truncated === true,
      simulated: false,
    };
  }

  let providerType: string | null = null;
  let message = `Gnani returned HTTP ${status}`;

  const standard = standardErrorSchema.safeParse(body);
  if (standard.success) {
    providerType = standard.data.error.type;
    message = standard.data.error.message;
  } else {
    const detail = detailErrorSchema.safeParse(body);
    if (detail.success) {
      providerType = detail.data.detail.error_code;
      message = detail.data.detail.message;
    } else {
      const gateway = gatewayErrorSchema.safeParse(body);
      if (gateway.success) {
        providerType = gateway.data.code;
        message = gateway.data.message;
      } else if (validationErrorSchema.safeParse(body).success) {
        providerType = 'VALIDATION_ERROR';
        message = 'Gnani rejected the request as invalid.';
      } else if (status >= 200 && status < 300) {
        message = 'Gnani returned a body that does not match the documented contract.';
      }
    }
  }

  throw new GnaniSttError(errorCodeFor(status, providerType), message, {
    providerStatus: status,
    ...(providerType ? { providerType } : {}),
  });
}

function validateLanguage(languageCode: string): void {
  const parts = languageCode
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 4) {
    throw new GnaniSttError('GNANI_UNSUPPORTED_LANGUAGE', 'language_code must contain 1–4 codes');
  }
  for (const part of parts) {
    if (!(SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(part)) {
      throw new GnaniSttError(
        'GNANI_UNSUPPORTED_LANGUAGE',
        `Unsupported Gnani language code: ${part}`,
      );
    }
  }
}

/**
 * Send one short clip to Gnani Prisma and return a validated transcript.
 * Provider errors are mapped to stable internal codes so the UI can explain
 * what failed without leaking response bodies.
 */
export async function transcribeAudio(
  input: TranscribeAudioInput,
  config: GnaniSttConfig = gnaniSttConfigFromEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<GnaniTranscription> {
  if (!gnaniSttConfigured(config)) {
    throw new GnaniSttError(
      'GNANI_NOT_CONFIGURED',
      'Gnani speech-to-text is not configured. Set GNANI_API_KEY in backend/.env.',
    );
  }
  if (input.bytes.byteLength === 0) {
    throw new GnaniSttError('GNANI_UNSUPPORTED_AUDIO', 'The audio file is empty.');
  }

  const languageCode = input.languageCode?.trim() || config.defaultLanguage;
  const format = input.format?.trim() || config.format;
  if (format !== 'transliterate') validateLanguage(languageCode);

  const form = new FormData();
  form.append(
    'audio_file',
    new Blob([new Uint8Array(input.bytes)], { type: input.mimeType }),
    input.filename,
  );
  form.append('model', config.model);
  if (format !== 'transliterate') form.append('language_code', languageCode);
  form.append('format', format);
  if (input.topic) form.append('topic', input.topic);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const requestId = `suraksha-${randomUUID()}`;

  try {
    const response = await fetchImpl(config.endpoint, {
      method: 'POST',
      headers: {
        // Verified header. Never `Authorization` or `x-api-key`.
        'X-API-Key-ID': config.apiKey,
        'X-API-Request-ID': requestId,
        accept: 'application/json',
      },
      body: form,
      signal: controller.signal,
    });

    const text = await response.text();
    let body: unknown = null;
    try {
      body = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      throw new GnaniSttError(
        'GNANI_BAD_RESPONSE',
        `Gnani returned non-JSON content (HTTP ${response.status}).`,
        { providerStatus: response.status },
      );
    }

    return parseGnaniSttResponse(response.status, body);
  } catch (error) {
    if (error instanceof GnaniSttError) throw error;
    if ((error as { name?: string }).name === 'AbortError') {
      throw new GnaniSttError(
        'GNANI_TIMEOUT',
        `Gnani did not respond within ${config.timeoutMs} ms.`,
      );
    }
    throw new GnaniSttError('GNANI_UNAVAILABLE', 'Could not reach Gnani speech-to-text.');
  } finally {
    clearTimeout(timer);
  }
}

import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.js';
import {
  GNANI_AUDIO_FORMATS,
  GNANI_MAX_AUDIO_SECONDS,
  GNANI_MAX_UPLOAD_BYTES,
  GnaniSttError,
  gnaniSttConfigured,
  transcribeAudio,
} from '../services/gnani.js';
import {
  classifySafetyText,
  SAFETY_ACTIONS,
  SAFETY_INTENTS,
  SAFETY_SEVERITIES,
  SUPPORTED_LANGUAGE_CODES,
} from '../services/intent.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

const ALLOWED_MIME = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
]);
const ALLOWED_EXTENSION = /\.(wav|mp3|ogg|flac|aac|m4a)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: GNANI_MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXTENSION.test(file.originalname);
    if (!allowed) {
      cb(
        new ApiError(
          400,
          'UNSUPPORTED_AUDIO',
          'Unsupported audio format. Send WAV, MP3, OGG, FLAC, AAC or M4A (mono, up to 30 seconds).',
        ),
      );
      return;
    }
    cb(null, true);
  },
});

/** Multer errors become the same structured API error as everything else. */
function receiveAudio(req: Request, res: Response, next: NextFunction): void {
  upload.single('audio')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new ApiError(413, 'AUDIO_TOO_LARGE', 'Audio upload is larger than 12 MB.'));
        return;
      }
      next(new ApiError(400, 'INVALID_AUDIO_UPLOAD', error.message));
      return;
    }
    next(error);
  });
}

const interpretSchema = z.object({
  text: z.string().trim().min(2).max(1000),
  language: z.string().trim().max(24).optional().default('auto'),
});

const transcribeSchema = z.object({
  language: z
    .string()
    .trim()
    .max(64)
    .optional()
    .default('auto')
    .refine(
      (value) =>
        value === 'auto' ||
        value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
          .every((part) => (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(part)),
      { message: 'Unsupported language code' },
    ),
  format: z
    .enum(['verbatim', 'transcribe', 'codemix', 'transliterate'])
    .optional(),
});

const rateLimitOptions = {
  windowMs: 60_000,
  limit: env.isTest ? 10_000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
} as const;

function providerStatusFor(error: GnaniSttError): number {
  switch (error.code) {
    case 'GNANI_NOT_CONFIGURED':
      return 503;
    case 'GNANI_AUTH_FAILED':
    case 'GNANI_SCOPE_NOT_ALLOWED':
    case 'GNANI_INSUFFICIENT_CREDIT':
      return 503;
    case 'GNANI_RATE_LIMITED':
      return 429;
    case 'GNANI_TIMEOUT':
      return 504;
    case 'GNANI_UNSUPPORTED_AUDIO':
    case 'GNANI_UNSUPPORTED_LANGUAGE':
      return 400;
    default:
      return 502;
  }
}

function throwApiError(error: GnaniSttError): never {
  throw new ApiError(providerStatusFor(error), error.code, error.message, {
    provider: 'gnani',
    providerStatus: error.providerStatus,
    providerType: error.providerType,
    manualSosAvailable: true,
  });
}

/**
 * Truthful provider status. Secrets are never returned. In this build Gnani is
 * used only for speech-to-text; intent classification is local.
 */
aiRouter.get('/status', (_req, res) => {
  const configured = gnaniSttConfigured();
  const liveAvailable = env.aiMode === 'live' && configured;

  res.json({
    ok: true,
    provider: {
      name: 'gnani',
      model: env.GNANI_STT_MODEL,
      mode: env.aiMode,
      configured,
      liveAvailable,
      sttEndpoint: env.GNANI_STT_URL,
      textIntent: 'local',
    },
    capabilities: {
      speechToText: true,
      speechToTextAvailable: liveAvailable,
      textInterpretation: true,
      textToSpeech: false,
      autoDispatch: false,
      autoIncidentCreation: false,
    },
    audio: {
      maxSeconds: GNANI_MAX_AUDIO_SECONDS,
      maxUploadBytes: GNANI_MAX_UPLOAD_BYTES,
      formats: GNANI_AUDIO_FORMATS,
    },
    languages: SUPPORTED_LANGUAGE_CODES,
    intents: SAFETY_INTENTS,
    severities: SAFETY_SEVERITIES,
    actions: SAFETY_ACTIONS,
    honesty: {
      simulated: false,
      liveSttAvailable: liveAvailable,
      localIntent: true,
      autoDispatch: false,
      requiresConfirmation: true,
      manualSosAvailable: true,
      note:
        'Intent classification is deterministic and local. Gnani Prisma v3.0 is used only for speech-to-text when configured. SURAKSHA AI never dispatches emergency services automatically.',
    },
  });
});

/**
 * Classify typed text. This is a local deterministic engine validated by Zod —
 * no cloud provider is claimed. The raw message is never written to audit.
 */
aiRouter.post(
  '/interpret',
  rateLimit(rateLimitOptions),
  asyncHandler(async (req, res) => {
    const input = interpretSchema.parse(req.body);
    const interpretation = classifySafetyText(input.text, {
      ...(input.language ? { language: input.language } : {}),
    });

    await audit(req, {
      action: 'AI_INTERPRETED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'ai',
      resourceId: '',
      detail: `provider=${interpretation.provider} mode=${interpretation.mode} intent=${interpretation.intent} severity=${interpretation.severity} ambiguous=${interpretation.ambiguous}`,
    });

    res.json({
      interpretation,
      honesty: {
        provider: 'local-intent',
        simulated: false,
        degraded: false,
        autoDispatch: false,
        autoIncidentCreation: false,
        requiresConfirmation: interpretation.requiresConfirmation,
        manualSosAvailable: true,
        note:
          'Deterministic local classification, not a cloud AI answer. This is guidance, not a dispatched emergency response.',
      },
    });
  }),
);

/**
 * Audio upload → Gnani Prisma v3.0 → transcript → local intent.
 *
 * A provider failure returns a structured error and never invents a transcript.
 * The client keeps manual SOS available regardless of this route's outcome.
 */
aiRouter.post(
  '/transcribe',
  rateLimit(rateLimitOptions),
  receiveAudio,
  asyncHandler(async (req, res) => {
    if (env.aiMode !== 'live') {
      await audit(req, {
        action: 'AI_TRANSCRIBED',
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        resourceType: 'ai',
        resourceId: '',
        outcome: 'FAILURE',
        detail: 'provider=gnani stage=stt code=AI_MODE_DISABLED',
      });
      throw new ApiError(
        503,
        'AI_MODE_DISABLED',
        'Speech-to-text is disabled because AI_MODE=console. Set AI_MODE=live and provide GNANI_API_KEY to enable voice transcription.',
        { provider: 'gnani', manualSosAvailable: true },
      );
    }

    if (!req.file) {
      throw new ApiError(400, 'AUDIO_REQUIRED', 'Attach an audio file in the `audio` field.');
    }

    const input = transcribeSchema.parse(req.body ?? {});
    const format = input.format ?? env.GNANI_STT_FORMAT;
    const languageCode = input.language === 'auto' ? env.GNANI_STT_LANGUAGE : input.language;

    let transcription;
    try {
      transcription = await transcribeAudio({
        bytes: req.file.buffer,
        filename: req.file.originalname || 'voice.m4a',
        mimeType: req.file.mimetype || 'application/octet-stream',
        languageCode,
        format,
        topic: 'women and child safety assistance request',
      });
    } catch (error) {
      if (error instanceof GnaniSttError) {
        await audit(req, {
          action: 'AI_TRANSCRIBED',
          actorId: req.auth!.sub,
          actorRole: req.auth!.role,
          resourceType: 'ai',
          resourceId: '',
          outcome: 'FAILURE',
          detail: `provider=gnani stage=stt code=${error.code} providerStatus=${error.providerStatus ?? 'none'}`,
        });
        throwApiError(error);
      }
      throw error;
    }

    if (transcription.transcript.trim().length === 0) {
      await audit(req, {
        action: 'AI_TRANSCRIBED',
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        resourceType: 'ai',
        resourceId: '',
        outcome: 'FAILURE',
        detail: 'provider=gnani stage=stt code=EMPTY_TRANSCRIPT',
      });
      throw new ApiError(
        422,
        'EMPTY_TRANSCRIPT',
        'No speech was detected. Try again in a quieter place and speak clearly.',
        { provider: 'gnani', manualSosAvailable: true },
      );
    }

    const interpretation = classifySafetyText(transcription.transcript, {
      transcript: transcription.transcript,
      ...(transcription.detectedLanguageCode
        ? { detectedLanguageCode: transcription.detectedLanguageCode }
        : {}),
    });

    await audit(req, {
      action: 'AI_TRANSCRIBED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'ai',
      resourceId: '',
      detail: `provider=gnani model=${transcription.model} requestId=${transcription.requestId} intent=${interpretation.intent} severity=${interpretation.severity} language=${interpretation.language} truncated=${transcription.truncated}`,
    });

    res.json({
      transcription,
      interpretation,
      honesty: {
        provider: 'gnani',
        model: transcription.model,
        simulated: false,
        degraded: false,
        autoDispatch: false,
        autoIncidentCreation: false,
        requiresConfirmation: interpretation.requiresConfirmation,
        manualSosAvailable: true,
        note:
          'The transcript came from Gnani Prisma v3.0. The intent was classified locally. Any SOS still needs your confirmation.',
      },
    });
  }),
);

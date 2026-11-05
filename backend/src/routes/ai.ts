import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import {
  gnaniConfigured,
  interpretSafetyText,
  SAFETY_INTENTS,
  SAFETY_SEVERITIES,
  SUGGESTED_ACTIONS,
} from '../services/ai.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

const interpretSchema = z.object({
  text: z.string().trim().min(2).max(1000),
  language: z.enum(['auto', 'en', 'hi', 'hinglish']).default('auto'),
});

/**
 * Truthful provider status. Secrets are never returned; `configured` only says
 * whether a live call is possible.
 */
aiRouter.get('/status', (_req, res) => {
  const configured = gnaniConfigured();
  res.json({
    ok: true,
    provider: {
      name: env.AI_PROVIDER,
      mode: env.aiMode,
      language: env.GNANI_LANGUAGE,
      configured,
      liveAvailable: env.aiMode === 'live' && configured,
    },
    capabilities: {
      textInterpretation: true,
      speechToText: false,
      textToSpeech: false,
      autoDispatch: false,
      autoIncidentCreation: false,
    },
    intents: SAFETY_INTENTS,
    severities: SAFETY_SEVERITIES,
    suggestedActions: SUGGESTED_ACTIONS,
    honesty: {
      simulated: env.aiMode !== 'live' || !configured,
      autoDispatch: false,
      requiresConfirmation: true,
      note:
        'Guidance only. SURAKSHA AI never dispatches emergency services automatically and never creates an incident without your confirmation.',
    },
  });
});

/**
 * Interpret a safety message and return Hinglish guidance. The raw message is
 * not written to the audit log. A provider outage falls back to the local
 * classifier with `degraded: true` so the app can say so.
 */
aiRouter.post(
  '/interpret',
  rateLimit({
    windowMs: 60_000,
    limit: env.isTest ? 10_000 : 60,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  asyncHandler(async (req, res) => {
    const input = interpretSchema.parse(req.body);
    const interpretation = await interpretSafetyText(input);

    await audit(req, {
      action: 'AI_INTERPRETED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'ai',
      resourceId: '',
      detail: `provider=${interpretation.provider} mode=${interpretation.mode} intent=${interpretation.intent} severity=${interpretation.severity} degraded=${interpretation.degraded} simulated=${interpretation.simulated}`,
    });

    res.json({
      interpretation,
      honesty: {
        autoDispatch: false,
        autoIncidentCreation: false,
        requiresConfirmation: interpretation.requiresConfirmation,
        simulated: interpretation.simulated,
        degraded: interpretation.degraded,
        note:
          'This is guidance, not a dispatched emergency response. Confirm SOS or call 112 when there is immediate danger.',
      },
    });
  }),
);

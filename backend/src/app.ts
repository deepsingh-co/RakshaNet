import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { contactsRouter } from './routes/contacts.js';
import { usersRouter } from './routes/users.js';
import { guardianRouter } from './routes/guardian.js';
import { incidentsRouter } from './routes/incidents.js';
import { notificationWebhookHandler } from './routes/notificationWebhook.js';
import { auditRouter } from './routes/audit.js';
import { analyticsRouter } from './routes/analytics.js';
import { notificationsRouter } from './routes/notifications.js';
import { errorHandler, notFound } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Non-browser clients (mobile apps) send no Origin — allow them.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Origin not allowed: ${origin}`));
      },
      credentials: true,
    }),
  );
  // Provider webhooks must see the exact raw body for HMAC verification, so
  // this route is mounted before the JSON parser.
  app.post(
    '/api/v1/notifications/webhook',
    express.raw({ type: 'application/json', limit: '64kb' }),
    notificationWebhookHandler,
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  // Auth endpoints are the most abused — tight limit.
  app.use('/api/v1/auth', rateLimit({ windowMs: 60_000, limit: env.isTest ? 10_000 : 30, standardHeaders: true, legacyHeaders: false }), authRouter);
  app.use('/api/v1/contacts', contactsRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/guardian', guardianRouter);
  app.use('/api/v1/incidents', incidentsRouter);
  app.use('/api/v1/audit', auditRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/notifications', notificationsRouter);

  app.get('/api/v1/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'suraksha-ai-backend',
      env: env.NODE_ENV,
      time: new Date().toISOString(),
    });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { connectDb, disconnectDb } from '../db/connect.js';
import { AuditLog } from '../models/AuditLog.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { User } from '../models/User.js';
import {
  GNANI_STT_ENDPOINT,
  GnaniSttError,
  gnaniSttConfigFromEnv,
  parseGnaniSttResponse,
  transcribeAudio,
  type GnaniSttConfig,
} from '../services/gnani.js';
import {
  classifySafetyText,
  interpretationSchema,
  SAFETY_INTENTS,
} from '../services/intent.js';
import { hashPassword } from '../services/password.js';
import { signAccessToken } from '../services/tokens.js';

const app = createApp();
const DB = 'mongodb://127.0.0.1:27017/suraksha_ai_test';

const successFixture = JSON.parse(
  readFileSync(new URL('../fixtures/gnani-stt-prisma-v3.success.json', import.meta.url), 'utf8'),
) as { response: Record<string, unknown> };

const authErrorFixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/gnani-stt-prisma-v3.auth-error.json', import.meta.url),
    'utf8',
  ),
) as { response: Record<string, unknown>; http_status: number };

const TEST_CONFIG: GnaniSttConfig = {
  apiKey: 'test-key-not-a-secret',
  endpoint: GNANI_STT_ENDPOINT,
  model: 'prisma-v3.0',
  defaultLanguage: 'indic-auto',
  format: 'codemix',
  timeoutMs: 2_000,
};

async function createUser() {
  const suffix = Math.random().toString(36).slice(2, 9);
  const user = await User.create({
    fullName: `AI ${suffix}`,
    email: `ai_${suffix}@example.com`,
    phone: `+9192${Math.floor(10000000 + Math.random() * 89999999)}`,
    passwordHash: await hashPassword('Assistant1'),
    role: 'USER',
    accountType: 'INDIVIDUAL',
    status: 'ACTIVE',
  });
  const token = signAccessToken({
    sub: user._id.toString(),
    role: 'USER',
    accountType: 'INDIVIDUAL',
  });
  return { user, token };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeAll(async () => {
  await connectDb(DB);
  await Promise.all([User.deleteMany({}), AuditLog.deleteMany({}), RefreshToken.deleteMany({})]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await Promise.all([User.deleteMany({}), AuditLog.deleteMany({}), RefreshToken.deleteMany({})]);
  await disconnectDb();
});

describe('Gnani Prisma v3.0 contract', () => {
  it('requires authentication for status, interpretation and transcription', async () => {
    expect((await request(app).get('/api/v1/ai/status')).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/v1/ai/interpret')
          .send({ text: 'madad chahiye' })
      ).status,
    ).toBe(401);
    expect((await request(app).post('/api/v1/ai/transcribe')).status).toBe(401);
  });

  it('reports local intent + unconfigured STT honestly', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/v1/ai/status').set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.provider.model).toBe('prisma-v3.0');
    expect(res.body.provider.textIntent).toBe('local');
    expect(res.body.provider.mode).toBe('console');
    expect(res.body.provider.configured).toBe(false);
    expect(res.body.provider.liveAvailable).toBe(false);
    expect(res.body.capabilities.speechToText).toBe(true);
    expect(res.body.capabilities.speechToTextAvailable).toBe(false);
    expect(res.body.capabilities.autoDispatch).toBe(false);
    expect(res.body.capabilities.autoIncidentCreation).toBe(false);
    expect(res.body.honesty.localIntent).toBe(true);
    expect(res.body.honesty.manualSosAvailable).toBe(true);
    expect(res.body.honesty.requiresConfirmation).toBe(true);
    expect(res.body.audio.maxSeconds).toBe(30);
    expect(res.body.languages).toContain('hi-IN');
    expect(res.body.languages).toContain('mr-IN');
    // Secrets are never echoed.
    expect(JSON.stringify(res.body)).not.toContain(env.GNANI_API_KEY || 'unset-secret');
  });

  it('uses only the required intent taxonomy', () => {
    expect([...SAFETY_INTENTS]).toEqual([
      'EMERGENCY_SOS',
      'SHARE_LOCATION',
      'START_JOURNEY',
      'CHECK_IN',
      'CALL_CONTACT',
      'CANCEL_SOS',
      'GENERAL_HELP',
      'UNKNOWN',
    ]);
  });

  it('classifies English, Hindi, Marathi and Hinglish intents', () => {
    const cases: Array<[string, string]> = [
      ['Bachao, koi mujhe follow kar raha hai', 'EMERGENCY_SOS'],
      ['मदद चाहिए, कोई पीछे आ रहा है', 'EMERGENCY_SOS'],
      ['मला मदत हवी, कोणी मागे येत आहे', 'EMERGENCY_SOS'],
      ['Meri location share karo', 'SHARE_LOCATION'],
      ['Mujhe ghar jaana hai.', 'START_JOURNEY'],
      ['Mera safar shuru karo', 'START_JOURNEY'],
      ['Main safe hoon, check in karo', 'CHECK_IN'],
      ['Please call my sister', 'CALL_CONTACT'],
      ['SOS cancel karo, main safe hoon', 'CANCEL_SOS'],
      ['Hello, yeh app kaise kaam karti hai?', 'GENERAL_HELP'],
      ['Aaj mausam accha hai', 'UNKNOWN'],
    ];

    for (const [text, intent] of cases) {
      expect(classifySafetyText(text).intent, text).toBe(intent);
    }
  });

  it('detects language from script and code-mixing', () => {
    expect(classifySafetyText('मैं सुरक्षित हूँ').language).toBe('hi-IN');
    expect(classifySafetyText('मी सुरक्षित आहे').language).toBe('mr-IN');
    expect(classifySafetyText('I am safe').language).toBe('en-IN');
    expect(classifySafetyText('Main safe hoon').language).toBe('hi-IN+en-IN');
  });

  it('marks low-confidence results ambiguous and never discards distress', () => {
    const unknown = classifySafetyText('Hmm');
    expect(unknown.intent).toBe('UNKNOWN');
    expect(unknown.confidence).toBeLessThan(0.45);
    expect(unknown.ambiguous).toBe(true);

    const scared = classifySafetyText('I am scared');
    expect(scared.intent).toBe('EMERGENCY_SOS');
    expect(scared.ambiguous).toBe(true);
    expect(scared.requiresConfirmation).toBe(true);
    expect(interpretationSchema.safeParse(scared).success).toBe(true);
  });

  it('returns validated local interpretation over HTTP without claiming a provider', async () => {
    const { token } = await createUser();
    const res = await request(app)
      .post('/api/v1/ai/interpret')
      .set(auth(token))
      .send({ text: 'Bachao! Koi maar raha hai, jaan ka khatra hai.' });

    expect(res.status).toBe(200);
    expect(res.body.interpretation.intent).toBe('EMERGENCY_SOS');
    expect(res.body.interpretation.severity).toBe('CRITICAL');
    expect(res.body.interpretation.action).toBe('OPEN_SOS');
    expect(res.body.interpretation.requiresConfirmation).toBe(true);
    expect(res.body.interpretation.provider).toBe('local-intent');
    expect(res.body.interpretation.mode).toBe('local');
    expect(res.body.interpretation.simulated).toBe(false);
    expect(res.body.interpretation.reply).toContain('112');
    expect(res.body.honesty.autoDispatch).toBe(false);
    expect(res.body.honesty.manualSosAvailable).toBe(true);
    expect(interpretationSchema.safeParse(res.body.interpretation).success).toBe(true);
  });

  it('validates text input length', async () => {
    const { token } = await createUser();
    expect(
      (
        await request(app)
          .post('/api/v1/ai/interpret')
          .set(auth(token))
          .send({ text: ' ' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/v1/ai/interpret')
          .set(auth(token))
          .send({ text: 'a'.repeat(1001) })
      ).status,
    ).toBe(400);
  });

  it('audits interpretation metadata without storing the raw message', async () => {
    const { user, token } = await createUser();
    const secretText = 'Mera ghar ke bahar koi anjaan aadmi khada hai';

    const res = await request(app)
      .post('/api/v1/ai/interpret')
      .set(auth(token))
      .send({ text: secretText });
    expect(res.status).toBe(200);

    const entry = await AuditLog.findOne({
      actorId: user._id,
      action: 'AI_INTERPRETED',
    });
    expect(entry).not.toBeNull();
    expect(entry?.detail).toContain('provider=local-intent');
    expect(entry?.detail).not.toContain(secretText);
    expect(entry?.outcome).toBe('SUCCESS');
  });
});

describe('Gnani STT client', () => {
  it('fails clearly when credentials are missing', async () => {
    await expect(
      transcribeAudio(
        { bytes: new Uint8Array([1, 2, 3]), filename: 'clip.wav', mimeType: 'audio/wav' },
        { ...TEST_CONFIG, apiKey: '' },
      ),
    ).rejects.toMatchObject({ code: 'GNANI_NOT_CONFIGURED' });
  });

  it('formats the multipart request and auth header exactly as documented', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const fakeFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;
      return jsonResponse(successFixture.response);
    }) as unknown as typeof fetch;

    const result = await transcribeAudio(
      {
        bytes: new Uint8Array([82, 73, 70, 70]),
        filename: 'clip.wav',
        mimeType: 'audio/wav',
        languageCode: 'hi-IN',
      },
      TEST_CONFIG,
      fakeFetch,
    );

    expect(capturedUrl).toBe(GNANI_STT_ENDPOINT);
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers['X-API-Key-ID']).toBe(TEST_CONFIG.apiKey);
    expect(headers['X-API-Request-ID']).toMatch(/^suraksha-/);
    expect(headers.authorization).toBeUndefined();
    expect(headers['x-api-key']).toBeUndefined();

    const form = capturedInit?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('model')).toBe('prisma-v3.0');
    expect(form.get('language_code')).toBe('hi-IN');
    expect(form.get('format')).toBe('codemix');
    expect(form.get('audio_file')).not.toBeNull();
    expect(result.transcript).toBe(successFixture.response.transcript);
  });

  it('parses the documented success fixture', () => {
    const parsed = parseGnaniSttResponse(200, successFixture.response);
    expect(parsed).toMatchObject({
      provider: 'gnani',
      model: 'prisma-v3.0',
      requestId: '5c1f0a52-6d62-4e0b-9a38-2f2b8a8f7a10',
      transcript: 'नमस्ते, आप कैसे हैं?',
      detectedLanguageCode: 'hi-IN',
      processingTime: 0.58,
      endToEndLatency: 0.66,
      truncated: false,
      simulated: false,
    });
  });

  it('rejects a body that does not match the contract', () => {
    expect(() => parseGnaniSttResponse(200, { nope: true })).toThrow(GnaniSttError);
    try {
      parseGnaniSttResponse(200, { nope: true });
    } catch (error) {
      expect((error as GnaniSttError).code).toBe('GNANI_BAD_RESPONSE');
    }
  });

  it('maps the documented authentication error fixture', () => {
    try {
      parseGnaniSttResponse(authErrorFixture.http_status, authErrorFixture.response);
      throw new Error('expected an error');
    } catch (error) {
      expect(error).toBeInstanceOf(GnaniSttError);
      expect((error as GnaniSttError).code).toBe('GNANI_AUTH_FAILED');
      expect((error as GnaniSttError).providerStatus).toBe(401);
    }
  });

  it('maps unsupported audio to a client-safe code', () => {
    try {
      parseGnaniSttResponse(400, {
        success: false,
        error: { type: 'UNSUPPORTED_AUDIO_FORMAT', message: 'Unsupported audio format.' },
      });
      throw new Error('expected an error');
    } catch (error) {
      expect((error as GnaniSttError).code).toBe('GNANI_UNSUPPORTED_AUDIO');
    }
  });

  it('reports a timeout instead of hanging', async () => {
    const fakeFetch = vi.fn(async () => {
      const abort = new Error('aborted');
      abort.name = 'AbortError';
      throw abort;
    }) as unknown as typeof fetch;

    await expect(
      transcribeAudio(
        { bytes: new Uint8Array([1]), filename: 'clip.wav', mimeType: 'audio/wav' },
        TEST_CONFIG,
        fakeFetch,
      ),
    ).rejects.toMatchObject({ code: 'GNANI_TIMEOUT' });
  });

  it('maps a provider outage to GNANI_UNAVAILABLE', async () => {
    const fakeFetch = vi.fn(async () =>
      jsonResponse(
        { success: false, error: { type: 'SERVICE_UNAVAILABLE', message: 'Down' } },
        503,
      ),
    ) as unknown as typeof fetch;

    await expect(
      transcribeAudio(
        { bytes: new Uint8Array([1]), filename: 'clip.wav', mimeType: 'audio/wav' },
        TEST_CONFIG,
        fakeFetch,
      ),
    ).rejects.toMatchObject({ code: 'GNANI_UNAVAILABLE' });
  });
});

describe('audio upload route', () => {
  const originalKey = env.GNANI_API_KEY;
  const originalMode = env.aiMode;

  afterEach(() => {
    env.GNANI_API_KEY = originalKey;
    env.aiMode = originalMode;
  });

  function enableLive() {
    env.GNANI_API_KEY = 'test-key-not-a-secret';
    env.aiMode = 'live';
  }

  it('returns a clear configuration error when live mode has no key', async () => {
    env.aiMode = 'live';
    env.GNANI_API_KEY = '';
    const { token } = await createUser();
    const res = await request(app)
      .post('/api/v1/ai/transcribe')
      .set(auth(token))
      .attach('audio', Buffer.from('fake-audio'), {
        filename: 'clip.wav',
        contentType: 'audio/wav',
      });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('GNANI_NOT_CONFIGURED');
    expect(res.body.error.details.manualSosAvailable).toBe(true);
  });

  it('refuses to call Gnani in console mode even if a key is present', async () => {
    env.aiMode = 'console';
    env.GNANI_API_KEY = 'test-key-not-a-secret';
    const fakeFetch = vi.fn();
    vi.stubGlobal('fetch', fakeFetch);

    const { token } = await createUser();
    const res = await request(app)
      .post('/api/v1/ai/transcribe')
      .set(auth(token))
      .attach('audio', Buffer.from('fake-audio'), {
        filename: 'clip.wav',
        contentType: 'audio/wav',
      });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_MODE_DISABLED');
    expect(res.body.error.details.manualSosAvailable).toBe(true);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('rejects an unsupported upload format before calling Gnani', async () => {
    enableLive();
    const fakeFetch = vi.fn();
    vi.stubGlobal('fetch', fakeFetch);

    const { token } = await createUser();
    const res = await request(app)
      .post('/api/v1/ai/transcribe')
      .set(auth(token))
      .attach('audio', Buffer.from('not audio'), {
        filename: 'note.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_AUDIO');
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('transcribes, classifies and audits without storing the transcript', async () => {
    enableLive();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(successFixture.response)),
    );

    const { user, token } = await createUser();
    const res = await request(app)
      .post('/api/v1/ai/transcribe')
      .set(auth(token))
      .field('language', 'auto')
      .attach('audio', Buffer.from('fake-audio'), {
        filename: 'clip.wav',
        contentType: 'audio/wav',
      });

    expect(res.status).toBe(200);
    expect(res.body.transcription.provider).toBe('gnani');
    expect(res.body.transcription.model).toBe('prisma-v3.0');
    expect(res.body.transcription.transcript).toBe('नमस्ते, आप कैसे हैं?');
    expect(res.body.transcription.detectedLanguageCode).toBe('hi-IN');
    expect(res.body.interpretation.provider).toBe('local-intent');
    expect(res.body.interpretation.intent).toBe('GENERAL_HELP');
    expect(res.body.honesty.autoIncidentCreation).toBe(false);
    expect(res.body.honesty.requiresConfirmation).toBe(
      res.body.interpretation.requiresConfirmation,
    );

    const entry = await AuditLog.findOne({ actorId: user._id, action: 'AI_TRANSCRIBED' });
    expect(entry).not.toBeNull();
    expect(entry?.detail).toContain('provider=gnani');
    expect(entry?.detail).not.toContain('नमस्ते');
  });

  it('reports an empty transcript honestly', async () => {
    enableLive();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          success: true,
          request_id: 'empty-1',
          transcript: '',
          model: 'prisma-v3.0',
        }),
      ),
    );

    const { token } = await createUser();
    const res = await request(app)
      .post('/api/v1/ai/transcribe')
      .set(auth(token))
      .attach('audio', Buffer.from('silence'), {
        filename: 'silence.wav',
        contentType: 'audio/wav',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('EMPTY_TRANSCRIPT');
    expect(res.body.error.details.manualSosAvailable).toBe(true);
  });

  it('keeps manual SOS available when Gnani is down', async () => {
    enableLive();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          { success: false, error: { type: 'SERVICE_UNAVAILABLE', message: 'Down' } },
          503,
        ),
      ),
    );

    const { token } = await createUser();
    const res = await request(app)
      .post('/api/v1/ai/transcribe')
      .set(auth(token))
      .attach('audio', Buffer.from('fake-audio'), {
        filename: 'clip.wav',
        contentType: 'audio/wav',
      });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('GNANI_UNAVAILABLE');
    expect(res.body.error.details.manualSosAvailable).toBe(true);
  });

  it('exposes the configured endpoint only as non-secret status data', async () => {
    enableLive();
    const { token } = await createUser();
    const res = await request(app).get('/api/v1/ai/status').set(auth(token));

    expect(res.body.provider.sttEndpoint).toBe(gnaniSttConfigFromEnv().endpoint);
    expect(res.body.provider.configured).toBe(true);
    expect(res.body.capabilities.speechToTextAvailable).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('test-key-not-a-secret');
  });
});

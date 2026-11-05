import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDb, disconnectDb } from '../db/connect.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { hashPassword } from '../services/password.js';
import { signAccessToken } from '../services/tokens.js';
import {
  classifySafetyText,
  parseGnaniResponse,
  SAFETY_INTENTS,
} from '../services/ai.js';

const app = createApp();
const DB = 'mongodb://127.0.0.1:27017/suraksha_ai_test';

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

beforeAll(async () => {
  await connectDb(DB);
  await Promise.all([User.deleteMany({}), AuditLog.deleteMany({}), RefreshToken.deleteMany({})]);
});

afterAll(async () => {
  await Promise.all([User.deleteMany({}), AuditLog.deleteMany({}), RefreshToken.deleteMany({})]);
  await disconnectDb();
});

describe('Gnani safety-advisor adapter', () => {
  it('requires authentication for status and interpretation', async () => {
    const status = await request(app).get('/api/v1/ai/status');
    expect(status.status).toBe(401);

    const interpret = await request(app)
      .post('/api/v1/ai/interpret')
      .send({ text: 'madad chahiye' });
    expect(interpret.status).toBe(401);
  });

  it('reports console mode honestly with no live provider configured', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/v1/ai/status').set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.provider.mode).toBe('console');
    expect(res.body.provider.configured).toBe(false);
    expect(res.body.provider.liveAvailable).toBe(false);
    expect(res.body.capabilities.autoDispatch).toBe(false);
    expect(res.body.capabilities.autoIncidentCreation).toBe(false);
    expect(res.body.capabilities.speechToText).toBe(false);
    expect(res.body.honesty.requiresConfirmation).toBe(true);
  });

  it('classifies a Hinglish SOS as critical and never claims dispatch', async () => {
    const { token } = await createUser();
    const res = await request(app)
      .post('/api/v1/ai/interpret')
      .set(auth(token))
      .send({ text: 'Bachao! Koi maar raha hai, jaan ka khatra hai.' });

    expect(res.status).toBe(200);
    expect(res.body.interpretation.intent).toBe('SOS');
    expect(res.body.interpretation.severity).toBe('CRITICAL');
    expect(res.body.interpretation.suggestedAction).toBe('CALL_112');
    expect(res.body.interpretation.requiresConfirmation).toBe(true);
    expect(res.body.interpretation.mode).toBe('console');
    expect(res.body.interpretation.simulated).toBe(true);
    expect(res.body.interpretation.degraded).toBe(false);
    expect(res.body.interpretation.provider).toBe('console');
    expect(res.body.interpretation.reply).toContain('112');
    expect(res.body.honesty.autoDispatch).toBe(false);
    expect(res.body.honesty.simulated).toBe(true);
  });

  it('classifies common safety situations deterministically', () => {
    const cases: Array<[string, string]> = [
      ['Koi mujhe peeche se follow kar raha hai', 'FOLLOWED'],
      ['Cab driver galat raaste se ja raha hai, unsafe lag raha hai', 'UNSAFE_CAB'],
      ['Yahan accident hua hai, khoon aa raha hai', 'ACCIDENT'],
      ['Bachche ko school ke paas khatra lag raha hai', 'CHILD_UNSAFE'],
      ['Ghar par akeli hoon, bahar kuch log khade hain', 'HOME_UNSAFE'],
      ['Koi mujhe pareshan kar raha hai aur dhamki de raha hai', 'HARASSMENT'],
      ['Hello, yeh app kaise kaam karti hai?', 'INFO'],
      ['Aaj mausam accha hai', 'UNKNOWN'],
    ];

    for (const [text, intent] of cases) {
      expect(classifySafetyText(text).intent, text).toBe(intent);
    }
    expect(SAFETY_INTENTS).toContain('UNSAFE_CAB');
  });

  it('does not treat the word "scared" as a cab ride', () => {
    expect(classifySafetyText('I am scared and alone').intent).toBe('HOME_UNSAFE');
  });

  it('validates input length', async () => {
    const { token } = await createUser();

    const empty = await request(app)
      .post('/api/v1/ai/interpret')
      .set(auth(token))
      .send({ text: ' ' });
    expect(empty.status).toBe(400);

    const tooLong = await request(app)
      .post('/api/v1/ai/interpret')
      .set(auth(token))
      .send({ text: 'a'.repeat(1001) });
    expect(tooLong.status).toBe(400);
  });

  it('audits the interpretation without storing the raw message', async () => {
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
    expect(entry?.detail).toContain('intent=HOME_UNSAFE');
    expect(entry?.detail).not.toContain(secretText);
    expect(entry?.outcome).toBe('SUCCESS');
  });

  it('parses provider aliases and falls back instead of inventing fields', () => {
    const fallback = classifySafetyText('madad chahiye');
    const parsed = parseGnaniResponse(
      {
        intent: 'following',
        severity: 'critical',
        confidence: 87,
        answer: 'Turant 112 par call kijiye.',
      },
      fallback,
    );

    expect(parsed.intent).toBe('FOLLOWED');
    expect(parsed.severity).toBe('CRITICAL');
    expect(parsed.confidence).toBe(0.87);
    expect(parsed.reply).toBe('Turant 112 par call kijiye.');
    expect(parsed.suggestedAction).toBe(fallback.suggestedAction);

    const empty = parseGnaniResponse({}, fallback);
    expect(empty.intent).toBe(fallback.intent);
    expect(empty.reply).toBe(fallback.reply);
    expect(empty.confidence).toBe(fallback.confidence);
  });
});

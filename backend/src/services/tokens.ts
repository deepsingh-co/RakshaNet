import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '../models/User.js';

export interface AccessPayload {
  sub: string;
  role: Role;
  accountType: string;
  type: 'access';
}

export interface RefreshPayload {
  sub: string;
  jti: string;
  familyId: string;
  type: 'refresh';
}

export function signAccessToken(payload: Omit<AccessPayload, 'type'>): string {
  const opts: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, opts);
}

export function signRefreshToken(payload: Omit<RefreshPayload, 'type'>): string {
  const opts: SignOptions = { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` };
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_REFRESH_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  if (decoded.type !== 'access') throw new Error('wrong token type');
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  if (decoded.type !== 'refresh') throw new Error('wrong token type');
  return decoded;
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function newFamilyId(): string {
  return crypto.randomUUID();
}

import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type AccessPayload } from '../services/tokens.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessPayload;
    }
  }
}

/** Bearer access-token guard. No session => 401, never a silent pass. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Missing bearer token' } });
    return;
  }
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token' } });
  }
}

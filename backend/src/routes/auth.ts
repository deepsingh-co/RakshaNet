import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { hashPassword, verifyPassword, burnPasswordCheck } from '../services/password.js';
import {
  newFamilyId,
  randomToken,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../services/tokens.js';
import { audit } from '../services/audit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { toPublicUser } from '../services/serialize.js';
import { env } from '../config/env.js';

export const authRouter = Router();

const REFRESH_COOKIE = 'suraksha_refresh';

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^\+?[0-9][0-9\s-]{5,19}$/, 'Enter a valid phone number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  preferredLanguage: z.enum(['en', 'hi', 'mr', 'ta', 'te', 'bn']).default('en'),
  accountType: z.enum(['INDIVIDUAL', 'GUARDIAN']).default('INDIVIDUAL'),
  /** child accounts can only be created inside a verified guardian flow later */
  guardianEmail: z.string().email().optional(),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(3), // email or phone
  password: z.string().min(1),
});

const refreshSchema = z.object({ refreshToken: z.string().optional() });

const otpSchema = z.object({ code: z.string().trim().length(6) });

const forgotSchema = z.object({ identifier: z.string().trim().min(3) });

const resetSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(128),
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalisePhone(p: string): string {
  return p.replace(/[\s-]/g, '');
}

async function issueSession(
  user: { _id: { toString(): string }; role: string; accountType: string },
  req: { get(name: string): string | undefined; ip?: string },
  familyId = newFamilyId(),
): Promise<{ accessToken: string; refreshToken: string }> {
  const jti = randomToken(16);
  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    jti,
    familyId,
  });
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role as never,
    accountType: user.accountType,
  });

  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: sha256(refreshToken),
    familyId,
    expiresAt,
    userAgent: (req.get('user-agent') ?? '').slice(0, 300),
    ip: req.ip ?? '',
  });

  return { accessToken, refreshToken };
}

function setRefreshCookie(res: import('express').Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    path: '/api/v1/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: import('express').Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
}

/* ------------------------------------------------------------------ */
/* POST /register                                                      */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);

    const existing = await User.findOne({
      $or: [{ email: body.email }, { phone: normalisePhone(body.phone) }],
    }).lean();
    if (existing) {
      throw new ApiError(
        409,
        'CONFLICT',
        'An account with this email or phone already exists. Try logging in.',
      );
    }

    let guardianId = null;
    if (body.accountType === 'GUARDIAN' && body.guardianEmail) {
      throw new ApiError(400, 'INVALID_INPUT', 'Guardian accounts do not link to a guardian');
    }

    const user = await User.create({
      fullName: body.fullName,
      email: body.email,
      phone: normalisePhone(body.phone),
      passwordHash: await hashPassword(body.password),
      preferredLanguage: body.preferredLanguage,
      accountType: body.accountType,
      role: body.accountType === 'GUARDIAN' ? 'GUARDIAN' : 'USER',
      guardianId,
      // OTP is generated when/if a provider is configured
      phoneVerified: false,
      emailVerified: false,
    });

    // Dev OTP: generated and logged server-side (never returned in prod).
    if (env.OTP_MODE === 'console') {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      user.set('otpHash', sha256(code));
      user.set('otpExpiresAt', new Date(Date.now() + 10 * 60 * 1000));
      await user.save();
      // eslint-disable-next-line no-console
      console.log(`[otp] verification code for ${user.email}: ${code}`);
    }

    const tokens = await issueSession(user, req);
    setRefreshCookie(res, tokens.refreshToken);

    await audit(req, {
      action: 'AUTH_REGISTER',
      actorId: user._id,
      actorRole: user.role,
      resourceType: 'user',
      resourceId: user._id.toString(),
    });

    res.status(201).json({
      user: toPublicUser(user),
      ...tokens,
      otpRequired: !user.phoneVerified,
    });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /login                                                         */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const identifier = body.identifier.toLowerCase();

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: normalisePhone(body.identifier) }],
    }).select('+passwordHash');

    if (!user || user.status === 'SUSPENDED') {
      await burnPasswordCheck(body.password);
      await audit(req, {
        action: 'AUTH_LOGIN_FAILED',
        detail: 'unknown or suspended account',
        outcome: 'FAILURE',
      });
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email/phone or password');
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      await audit(req, {
        action: 'AUTH_LOGIN_FAILED',
        actorId: user._id,
        actorRole: user.role,
        outcome: 'FAILURE',
      });
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email/phone or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await issueSession(user, req);
    setRefreshCookie(res, tokens.refreshToken);

    await audit(req, {
      action: 'AUTH_LOGIN',
      actorId: user._id,
      actorRole: user.role,
      resourceType: 'user',
      resourceId: user._id.toString(),
    });

    res.json({ user: toPublicUser(user), ...tokens });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /refresh — rotation + reuse detection                          */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const body = refreshSchema.parse(req.body ?? {});
    const raw: string | undefined = req.cookies?.[REFRESH_COOKIE] ?? body.refreshToken;
    if (!raw) throw new ApiError(401, 'UNAUTHENTICATED', 'No refresh token');

    let payload;
    try {
      payload = verifyRefreshToken(raw);
    } catch {
      clearRefreshCookie(res);
      throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid or expired refresh token');
    }

    const hash = sha256(raw);
    const stored = await RefreshToken.findOne({ tokenHash: hash });

    if (!stored || stored.revokedAt) {
      // Reuse of a rotated token: revoke the whole family.
      if (stored?.familyId) {
        await RefreshToken.updateMany(
          { familyId: stored.familyId, revokedAt: null },
          { $set: { revokedAt: new Date() } },
        );
        await audit(req, {
          action: 'AUTH_REFRESH_REUSE_DETECTED',
          actorId: payload.sub,
          detail: `family ${stored.familyId}`,
          outcome: 'FAILURE',
        });
      }
      clearRefreshCookie(res);
      throw new ApiError(401, 'UNAUTHENTICATED', 'Refresh token is no longer valid');
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      clearRefreshCookie(res);
      throw new ApiError(401, 'UNAUTHENTICATED', 'Refresh token expired');
    }

    const user = await User.findById(stored.userId);
    if (!user || user.status !== 'ACTIVE') {
      clearRefreshCookie(res);
      throw new ApiError(401, 'UNAUTHENTICATED', 'Account is not active');
    }

    // Rotate: revoke current, issue next in the same family.
    const next = await issueSession(user, req, stored.familyId);
    stored.revokedAt = new Date();
    stored.replacedByHash = sha256(next.refreshToken);
    await stored.save();

    setRefreshCookie(res, next.refreshToken);

    await audit(req, {
      action: 'AUTH_REFRESH',
      actorId: user._id,
      actorRole: user.role,
      resourceType: 'user',
      resourceId: user._id.toString(),
    });

    res.json({ user: toPublicUser(user), ...next });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /logout                                                        */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw: string | undefined = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    if (raw) {
      const hash = sha256(raw);
      const stored = await RefreshToken.findOne({ tokenHash: hash });
      if (stored && !stored.revokedAt) {
        stored.revokedAt = new Date();
        await stored.save();
      }
    }
    clearRefreshCookie(res);
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /logout-all                                                    */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await RefreshToken.updateMany(
      { userId: req.auth!.sub, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    clearRefreshCookie(res);
    await audit(req, {
      action: 'AUTH_LOGOUT_ALL',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
    });
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /me                                                             */
/* ------------------------------------------------------------------ */

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth!.sub);
    if (!user || user.status === 'DELETION_REQUESTED') {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Account not available');
    }
    res.json({ user: toPublicUser(user) });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /verify-otp                                                    */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/verify-otp',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { code } = otpSchema.parse(req.body);
    const user = await User.findById(req.auth!.sub).select('+otpHash +otpExpiresAt');
    if (!user || !user.otpHash || !user.otpExpiresAt) {
      throw new ApiError(400, 'NO_OTP', 'No verification code is pending');
    }
    if (user.otpExpiresAt.getTime() < Date.now()) {
      throw new ApiError(400, 'OTP_EXPIRED', 'Verification code expired — request a new one');
    }
    if (sha256(code) !== user.otpHash) {
      throw new ApiError(400, 'OTP_INVALID', 'Incorrect verification code');
    }
    user.phoneVerified = true;
    user.set('otpHash', null);
    user.set('otpExpiresAt', null);
    await user.save();

    await audit(req, {
      action: 'OTP_VERIFIED',
      actorId: user._id,
      actorRole: user.role,
      resourceType: 'user',
      resourceId: user._id.toString(),
    });

    res.json({ user: toPublicUser(user) });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /forgot-password                                               */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { identifier } = forgotSchema.parse(req.body);
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: normalisePhone(identifier) }],
    });

    // Always the same response — do not reveal whether an account exists.
    if (user && user.status === 'ACTIVE') {
      const token = randomToken(32);
      user.set('resetTokenHash', sha256(token));
      user.set('resetTokenExpiresAt', new Date(Date.now() + 30 * 60 * 1000));
      await user.save();

      if (env.OTP_MODE === 'console') {
        // eslint-disable-next-line no-console
        console.log(`[reset] password reset token for ${user.email}: ${token}`);
      }
      await audit(req, {
        action: 'AUTH_PASSWORD_RESET_REQUESTED',
        actorId: user._id,
        actorRole: user.role,
      });
    }

    res.json({ ok: true, message: 'If the account exists, reset instructions have been sent.' });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /reset-password                                                */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const body = resetSchema.parse(req.body);
    const hash = sha256(body.token);
    const user = await User.findOne({
      resetTokenHash: hash,
      resetTokenExpiresAt: { $gt: new Date() },
    }).select('+resetTokenHash +resetTokenExpiresAt');

    if (!user) throw new ApiError(400, 'RESET_INVALID', 'Reset link is invalid or expired');

    user.passwordHash = await hashPassword(body.password);
    user.set('resetTokenHash', null);
    user.set('resetTokenExpiresAt', null);
    await user.save();

    // All sessions die on password change.
    await RefreshToken.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    await audit(req, {
      action: 'AUTH_PASSWORD_RESET',
      actorId: user._id,
      actorRole: user.role,
      resourceType: 'user',
      resourceId: user._id.toString(),
    });

    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* DELETE /account — deletion request (not an instant hard delete)     */
/* ------------------------------------------------------------------ */

authRouter.delete(
  '/account',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth!.sub);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'Account not found');

    user.status = 'DELETION_REQUESTED';
    user.deletedAt = new Date();
    await user.save();

    await RefreshToken.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    clearRefreshCookie(res);

    await audit(req, {
      action: 'ACCOUNT_DELETION_REQUESTED',
      actorId: user._id,
      actorRole: user.role,
      resourceType: 'user',
      resourceId: user._id.toString(),
    });

    res.json({ ok: true, message: 'Account deletion requested' });
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.js';
import { toPublicUser } from '../services/serialize.js';
import { sha256 } from '../services/tokens.js';
import { env } from '../config/env.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^\+?[0-9][0-9\s-]{5,19}$/, 'Enter a valid phone number');

const updateMeSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    phone: phoneSchema.optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    preferredLanguage: z.enum(['en', 'hi', 'mr', 'ta', 'te', 'bn']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(['USER', 'GUARDIAN', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETION_REQUESTED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });

function normalisePhone(p: string): string {
  return p.replace(/[\s-]/g, '');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ------------------------------------------------------------------ */
/* PATCH /users/me                                                     */
/* ------------------------------------------------------------------ */

usersRouter.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const body = updateMeSchema.parse(req.body);
    const user = await User.findById(req.auth!.sub);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'Account not found');

    if (body.fullName !== undefined) user.fullName = body.fullName;
    if (body.preferredLanguage !== undefined) user.preferredLanguage = body.preferredLanguage;

    let phoneChanged = false;
    if (body.phone !== undefined) {
      const phone = normalisePhone(body.phone);
      if (phone !== user.phone) {
        const duplicate = await User.findOne({ phone, _id: { $ne: user._id } });
        if (duplicate) throw new ApiError(409, 'CONFLICT', 'This phone number is already registered');
        user.phone = phone;
        user.phoneVerified = false;
        phoneChanged = true;
      }
    }

    if (body.email !== undefined && body.email !== user.email) {
      const duplicate = await User.findOne({ email: body.email, _id: { $ne: user._id } });
      if (duplicate) throw new ApiError(409, 'CONFLICT', 'This email is already registered');
      user.email = body.email;
      user.emailVerified = false;
    }

    if (phoneChanged && env.OTP_MODE === 'console') {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      user.set('otpHash', sha256(code));
      user.set('otpExpiresAt', new Date(Date.now() + 10 * 60 * 1000));
      // eslint-disable-next-line no-console
      console.log(`[otp] new phone verification code for ${user.email}: ${code}`);
    }

    await user.save();

    await audit(req, {
      action: 'PROFILE_UPDATED',
      actorId: user._id,
      actorRole: user.role,
      resourceType: 'user',
      resourceId: user._id.toString(),
      detail: phoneChanged ? 'phone changed — verification reset' : 'profile updated',
    });

    res.json({ user: toPublicUser(user), otpRequired: phoneChanged && !user.phoneVerified });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /users — admin only                                             */
/* ------------------------------------------------------------------ */

usersRouter.get(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { q, role, status, page, limit } = listQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    await audit(req, {
      action: 'ADMIN_ACTION',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'user_list',
      detail: `list users (${total} results)`,
    });

    res.json({
      users: users.map(toPublicUser),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /users/:id — admin, or the user themself                        */
/* ------------------------------------------------------------------ */

usersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const isSelf = req.params.id === req.auth!.sub;
    if (!isSelf && req.auth!.role !== 'ADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'You can only view your own profile');
    }
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

    if (!isSelf) {
      await audit(req, {
        action: 'ADMIN_ACTION',
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        resourceType: 'user',
        resourceId: user._id.toString(),
        detail: 'viewed user profile',
      });
    }

    res.json({ user: toPublicUser(user) });
  }),
);

/* ------------------------------------------------------------------ */
/* PATCH /users/:id/status — admin only                                */
/* ------------------------------------------------------------------ */

usersRouter.patch(
  '/:id/status',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { status } = statusSchema.parse(req.body);

    if (req.params.id === req.auth!.sub) {
      throw new ApiError(400, 'INVALID_ACTION', 'You cannot change your own account status');
    }

    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

    // Admins are protected from other admins' status changes.
    if (user.role === 'ADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'Administrator accounts cannot be modified here');
    }

    user.status = status;
    await user.save();

    if (status === 'SUSPENDED') {
      await RefreshToken.updateMany(
        { userId: user._id, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    }

    await audit(req, {
      action: 'ADMIN_ACTION',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'user',
      resourceId: user._id.toString(),
      detail: `status changed to ${status}`,
    });

    res.json({ user: toPublicUser(user) });
  }),
);

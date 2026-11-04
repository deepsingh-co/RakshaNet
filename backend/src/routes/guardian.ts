import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { GuardianLink } from '../models/GuardianLink.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.js';
import { hashPassword } from '../services/password.js';
import { sha256 } from '../services/tokens.js';
import { env } from '../config/env.js';
import { maskPhone } from '../models/TrustedContact.js';

export const guardianRouter = Router();
guardianRouter.use(requireAuth);

const inviteSchema = z.object({ childEmail: z.string().trim().toLowerCase().email() });
const acceptSchema = z.object({ code: z.string().trim().length(6) });
const createChildSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^\+?[0-9][0-9\s-]{5,19}$/),
  password: z.string().min(8).max(128),
  preferredLanguage: z.enum(['en', 'hi', 'mr', 'ta', 'te', 'bn']).default('en'),
});

function normalisePhone(p: string): string {
  return p.replace(/[\s-]/g, '');
}

function requireGuardian(req: import('express').Request): void {
  if (req.auth!.role !== 'GUARDIAN') {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'Only verified guardian accounts can manage guardian links',
    );
  }
}

function linkView(
  link: InstanceType<typeof GuardianLink>,
  counterpart: { fullName: string; email: string; phone: string } | null,
  viewerRole: 'GUARDIAN' | 'CHILD',
) {
  return {
    id: link._id.toString(),
    status: link.status,
    initiatedBy: link.initiatedBy,
    viewerRole,
    guardianId: link.guardianId.toString(),
    childId: link.childId.toString(),
    counterpart: counterpart
      ? {
          fullName: counterpart.fullName,
          email: counterpart.email,
          phoneMasked: maskPhone(counterpart.phone),
        }
      : null,
    verifiedAt: link.verifiedAt,
    revokedAt: link.revokedAt,
    createdAt: link.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* POST /guardian/links — invite an existing user to link as child     */
/* ------------------------------------------------------------------ */

guardianRouter.post(
  '/links',
  asyncHandler(async (req, res) => {
    requireGuardian(req);
    const { childEmail } = inviteSchema.parse(req.body);

    const child = await User.findOne({ email: childEmail });
    if (!child) throw new ApiError(404, 'NOT_FOUND', 'No account found with that email');
    if (child._id.toString() === req.auth!.sub) {
      throw new ApiError(400, 'INVALID_ACTION', 'You cannot link your own account');
    }
    if (child.role === 'ADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'Administrator accounts cannot be linked as children');
    }

    const existing = await GuardianLink.findOne({
      guardianId: req.auth!.sub,
      childId: child._id,
    });

    if (existing?.status === 'VERIFIED') {
      throw new ApiError(409, 'CONFLICT', 'This child is already linked to your account');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = sha256(code);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (existing) {
      existing.status = 'PENDING';
      existing.initiatedBy = 'GUARDIAN';
      existing.set('consentCodeHash', codeHash);
      existing.set('consentCodeExpiresAt', expires);
      existing.revokedAt = null;
      existing.revokedBy = '';
      await existing.save();
    } else {
      await GuardianLink.create({
        guardianId: req.auth!.sub,
        childId: child._id,
        status: 'PENDING',
        initiatedBy: 'GUARDIAN',
        consentCodeHash: codeHash,
        consentCodeExpiresAt: expires,
      });
    }

    if (env.OTP_MODE === 'console') {
      // eslint-disable-next-line no-console
      console.log(`[guardian] consent code for ${child.email}: ${code}`);
    }

    await audit(req, {
      action: 'GUARDIAN_LINK_CREATED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'guardian_link',
      resourceId: child._id.toString(),
      detail: `invited ${child.email} (pending consent)`,
    });

    res.status(201).json({
      ok: true,
      message: 'Invitation sent. The child must accept with the consent code.',
      ...(env.OTP_MODE === 'console' ? { devCode: code } : {}),
    });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /guardian/links/:id/accept — child consents                    */
/* ------------------------------------------------------------------ */

guardianRouter.post(
  '/links/:id/accept',
  asyncHandler(async (req, res) => {
    const { code } = acceptSchema.parse(req.body);

    const link = await GuardianLink.findById(req.params.id).select(
      '+consentCodeHash +consentCodeExpiresAt',
    );
    if (!link) throw new ApiError(404, 'NOT_FOUND', 'Link invitation not found');
    if (link.childId.toString() !== req.auth!.sub) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the invited child can accept this link');
    }
    if (link.status !== 'PENDING') {
      throw new ApiError(409, 'CONFLICT', `Link is already ${link.status.toLowerCase()}`);
    }
    if (!link.consentCodeHash || !link.consentCodeExpiresAt) {
      throw new ApiError(400, 'NO_CODE', 'No consent code is pending');
    }
    if (link.consentCodeExpiresAt.getTime() < Date.now()) {
      throw new ApiError(400, 'CODE_EXPIRED', 'Consent code expired — ask for a new invitation');
    }
    if (sha256(code) !== link.consentCodeHash) {
      throw new ApiError(400, 'CODE_INVALID', 'Incorrect consent code');
    }

    link.status = 'VERIFIED';
    link.verifiedAt = new Date();
    link.set('consentCodeHash', null);
    link.set('consentCodeExpiresAt', null);
    await link.save();

    // Maintain denormalised references on both accounts.
    const child = await User.findById(link.childId);
    const guardian = await User.findById(link.guardianId);
    if (child) {
      child.guardianId = link.guardianId;
      if (child.accountType === 'INDIVIDUAL') child.accountType = 'CHILD';
      await child.save();
    }
    if (guardian && !guardian.childIds.some((id) => id.toString() === link.childId.toString())) {
      guardian.childIds.push(link.childId);
      await guardian.save();
    }

    await audit(req, {
      action: 'GUARDIAN_LINK_CREATED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'guardian_link',
      resourceId: link._id.toString(),
      detail: 'child accepted guardian link',
    });

    res.json({ ok: true, status: link.status });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /guardian/links — own links (guardian or child)                 */
/* ------------------------------------------------------------------ */

guardianRouter.get(
  '/links',
  asyncHandler(async (req, res) => {
    const asGuardian = await GuardianLink.find({ guardianId: req.auth!.sub });
    const asChild = await GuardianLink.find({ childId: req.auth!.sub });

    const guardianIds = [...new Set(asChild.map((l) => l.guardianId.toString()))];
    const childIds = [...new Set(asGuardian.map((l) => l.childId.toString()))];
    const people = await User.find({ _id: { $in: [...guardianIds, ...childIds] } }).select(
      'fullName email phone',
    );
    const byId = new Map(people.map((p) => [p._id.toString(), p]));

    res.json({
      asGuardian: asGuardian.map((l) =>
        linkView(l, byId.get(l.childId.toString()) ?? null, 'GUARDIAN'),
      ),
      asChild: asChild.map((l) =>
        linkView(l, byId.get(l.guardianId.toString()) ?? null, 'CHILD'),
      ),
    });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /guardian/children — create a child account (guardian flow)    */
/* ------------------------------------------------------------------ */

guardianRouter.post(
  '/children',
  asyncHandler(async (req, res) => {
    requireGuardian(req);
    const body = createChildSchema.parse(req.body);

    const existing = await User.findOne({
      $or: [{ email: body.email }, { phone: normalisePhone(body.phone) }],
    });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'An account with this email or phone already exists');
    }

    const child = await User.create({
      fullName: body.fullName,
      email: body.email,
      phone: normalisePhone(body.phone),
      passwordHash: await hashPassword(body.password),
      preferredLanguage: body.preferredLanguage,
      accountType: 'CHILD',
      role: 'USER',
      guardianId: req.auth!.sub,
      phoneVerified: false,
      emailVerified: false,
    });

    await GuardianLink.create({
      guardianId: req.auth!.sub,
      childId: child._id,
      status: 'VERIFIED',
      initiatedBy: 'GUARDIAN',
      verifiedAt: new Date(),
    });

    const guardian = await User.findById(req.auth!.sub);
    if (guardian) {
      guardian.childIds.push(child._id);
      await guardian.save();
    }

    await audit(req, {
      action: 'GUARDIAN_LINK_CREATED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'user',
      resourceId: child._id.toString(),
      detail: `created child account ${child.email}`,
    });

    res.status(201).json({
      child: {
        id: child._id.toString(),
        fullName: child.fullName,
        email: child.email,
        phoneMasked: maskPhone(child.phone),
        accountType: child.accountType,
      },
      linkStatus: 'VERIFIED',
    });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /guardian/links/all — admin overview                            */
/* ------------------------------------------------------------------ */

guardianRouter.get(
  '/links/all',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const links = await GuardianLink.find().sort({ createdAt: -1 }).limit(500);
    const ids = [...new Set(links.flatMap((l) => [l.guardianId.toString(), l.childId.toString()]))];
    const people = await User.find({ _id: { $in: ids } }).select('fullName email phone');
    const byId = new Map(people.map((p) => [p._id.toString(), p]));

    await audit(req, {
      action: 'ADMIN_ACTION',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'guardian_link',
      detail: `viewed ${links.length} guardian links`,
    });

    res.json({
      links: links.map((l) => ({
        id: l._id.toString(),
        status: l.status,
        guardian: byId.get(l.guardianId.toString()) ?? null,
        child: byId.get(l.childId.toString()) ?? null,
        verifiedAt: l.verifiedAt,
        revokedAt: l.revokedAt,
        createdAt: l.createdAt,
      })),
    });
  }),
);

/* ------------------------------------------------------------------ */
/* DELETE /guardian/links/:id — either party can revoke                */
/* ------------------------------------------------------------------ */

guardianRouter.delete(
  '/links/:id',
  asyncHandler(async (req, res) => {
    const link = await GuardianLink.findById(req.params.id);
    if (!link) throw new ApiError(404, 'NOT_FOUND', 'Link not found');

    const isGuardian = link.guardianId.toString() === req.auth!.sub;
    const isChild = link.childId.toString() === req.auth!.sub;
    const isAdmin = req.auth!.role === 'ADMIN';
    if (!isGuardian && !isChild && !isAdmin) {
      throw new ApiError(403, 'FORBIDDEN', 'You cannot revoke this link');
    }

    link.status = 'REVOKED';
    link.revokedAt = new Date();
    link.revokedBy = isAdmin ? 'ADMIN' : isGuardian ? 'GUARDIAN' : 'CHILD';
    await link.save();

    const child = await User.findById(link.childId);
    if (child && child.guardianId?.toString() === link.guardianId.toString()) {
      child.guardianId = null;
      await child.save();
    }
    const guardian = await User.findById(link.guardianId);
    if (guardian) {
      guardian.childIds = guardian.childIds.filter(
        (id) => id.toString() !== link.childId.toString(),
      );
      await guardian.save();
    }

    await audit(req, {
      action: 'GUARDIAN_LINK_REVOKED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'guardian_link',
      resourceId: link._id.toString(),
      detail: `revoked by ${link.revokedBy.toLowerCase()}`,
    });

    res.json({ ok: true });
  }),
);

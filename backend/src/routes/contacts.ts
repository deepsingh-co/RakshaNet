import { Router } from 'express';
import { z } from 'zod';
import { TrustedContact, maskPhone, RELATIONSHIPS } from '../models/TrustedContact.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.js';
import { randomToken, sha256 } from '../services/tokens.js';
import { env } from '../config/env.js';

export const contactsRouter = Router();
contactsRouter.use(requireAuth);

const MAX_CONTACTS = 20;

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^\+?[0-9][0-9\s-]{5,19}$/, 'Enter a valid phone number');

const prefsSchema = z.object({
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  relationship: z.enum(RELATIONSHIPS).default('OTHER'),
  email: z.string().email().optional().or(z.literal('')),
  notificationPreferences: prefsSchema.optional(),
  isPrimary: z.boolean().optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: phoneSchema.optional(),
    relationship: z.enum(RELATIONSHIPS).optional(),
    email: z.string().email().optional().or(z.literal('')),
    notificationPreferences: prefsSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const otpSchema = z.object({ code: z.string().trim().length(6) });

function normalisePhone(p: string): string {
  return p.replace(/[\s-]/g, '');
}

function toContact(c: InstanceType<typeof TrustedContact>) {
  return {
    id: c._id.toString(),
    name: c.name,
    phone: c.phone,
    phoneMasked: maskPhone(c.phone),
    relationship: c.relationship,
    email: c.email,
    notificationPreferences: c.notificationPreferences,
    isPrimary: c.isPrimary,
    verificationStatus: c.verificationStatus,
    verifiedAt: c.verifiedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/* ------------------------------------------------------------------ */
/* GET /contacts                                                       */
/* ------------------------------------------------------------------ */

contactsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const contacts = await TrustedContact.find({ userId: req.auth!.sub }).sort({
      isPrimary: -1,
      createdAt: 1,
    });
    res.json({ contacts: contacts.map(toContact) });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /contacts                                                      */
/* ------------------------------------------------------------------ */

contactsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const userId = req.auth!.sub;

    const count = await TrustedContact.countDocuments({ userId });
    if (count >= MAX_CONTACTS) {
      throw new ApiError(400, 'LIMIT_REACHED', `You can have at most ${MAX_CONTACTS} trusted contacts`);
    }

    const phone = normalisePhone(body.phone);
    const existing = await TrustedContact.findOne({ userId, phone });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'This phone number is already a trusted contact');
    }

    // First contact becomes primary automatically.
    const isFirst = count === 0;

    const contact = await TrustedContact.create({
      userId,
      name: body.name,
      phone,
      relationship: body.relationship,
      email: body.email ?? '',
      notificationPreferences: {
        push: body.notificationPreferences?.push ?? true,
        sms: body.notificationPreferences?.sms ?? true,
        whatsapp: body.notificationPreferences?.whatsapp ?? true,
      },
      isPrimary: isFirst,
      verificationStatus: 'UNVERIFIED',
    });

    await audit(req, {
      action: 'CONTACT_CREATED',
      actorId: userId,
      actorRole: req.auth!.role,
      resourceType: 'contact',
      resourceId: contact._id.toString(),
      detail: `phone ${maskPhone(phone)}`,
    });

    res.status(201).json({ contact: toContact(contact) });
  }),
);

/* ------------------------------------------------------------------ */
/* GET /contacts/:id                                                   */
/* ------------------------------------------------------------------ */

contactsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const contact = await TrustedContact.findOne({
      _id: req.params.id,
      userId: req.auth!.sub,
    });
    if (!contact) throw new ApiError(404, 'NOT_FOUND', 'Contact not found');
    res.json({ contact: toContact(contact) });
  }),
);

/* ------------------------------------------------------------------ */
/* PATCH /contacts/:id                                                 */
/* ------------------------------------------------------------------ */

contactsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const contact = await TrustedContact.findOne({
      _id: req.params.id,
      userId: req.auth!.sub,
    });
    if (!contact) throw new ApiError(404, 'NOT_FOUND', 'Contact not found');

    if (body.name !== undefined) contact.name = body.name;
    if (body.relationship !== undefined) contact.relationship = body.relationship;
    if (body.email !== undefined) contact.email = body.email;
    if (body.notificationPreferences) {
      const p = body.notificationPreferences;
      const current = contact.notificationPreferences ?? { push: true, sms: true, whatsapp: true };
      contact.notificationPreferences = {
        push: p.push ?? current.push,
        sms: p.sms ?? current.sms,
        whatsapp: p.whatsapp ?? current.whatsapp,
      };
    }

    let phoneChanged = false;
    if (body.phone !== undefined) {
      const phone = normalisePhone(body.phone);
      if (phone !== contact.phone) {
        const duplicate = await TrustedContact.findOne({
          userId: req.auth!.sub,
          phone,
          _id: { $ne: contact._id },
        });
        if (duplicate) {
          throw new ApiError(409, 'CONFLICT', 'This phone number is already a trusted contact');
        }
        contact.phone = phone;
        // Changing the number invalidates verification.
        contact.verificationStatus = 'UNVERIFIED';
        contact.verifiedAt = null;
        contact.set('otpHash', null);
        contact.set('otpExpiresAt', null);
        phoneChanged = true;
      }
    }

    await contact.save();

    await audit(req, {
      action: 'CONTACT_UPDATED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'contact',
      resourceId: contact._id.toString(),
      detail: phoneChanged ? 'phone changed — verification reset' : 'details updated',
    });

    res.json({ contact: toContact(contact) });
  }),
);

/* ------------------------------------------------------------------ */
/* DELETE /contacts/:id                                                */
/* ------------------------------------------------------------------ */

contactsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const contact = await TrustedContact.findOne({
      _id: req.params.id,
      userId: req.auth!.sub,
    });
    if (!contact) throw new ApiError(404, 'NOT_FOUND', 'Contact not found');

    await contact.deleteOne();

    // Promote the next verified contact when the primary was removed.
    if (contact.isPrimary) {
      const next = await TrustedContact.findOne({
        userId: req.auth!.sub,
        verificationStatus: 'VERIFIED',
      }).sort({ createdAt: 1 });
      if (next) {
        next.isPrimary = true;
        await next.save();
      }
    }

    await audit(req, {
      action: 'CONTACT_DELETED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'contact',
      resourceId: contact._id.toString(),
    });

    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /contacts/:id/request-verification                             */
/* ------------------------------------------------------------------ */

contactsRouter.post(
  '/:id/request-verification',
  asyncHandler(async (req, res) => {
    const contact = await TrustedContact.findOne({
      _id: req.params.id,
      userId: req.auth!.sub,
    });
    if (!contact) throw new ApiError(404, 'NOT_FOUND', 'Contact not found');

    const code = String(Math.floor(100000 + Math.random() * 900000));
    contact.verificationStatus = 'PENDING';
    contact.set('otpHash', sha256(code));
    contact.set('otpExpiresAt', new Date(Date.now() + 10 * 60 * 1000));
    await contact.save();

    if (env.OTP_MODE === 'console') {
      // eslint-disable-next-line no-console
      console.log(`[contact-otp] ${maskPhone(contact.phone)} verification code: ${code}`);
    }

    await audit(req, {
      action: 'CONTACT_UPDATED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'contact',
      resourceId: contact._id.toString(),
      detail: 'verification requested',
    });

    res.json({
      ok: true,
      message: 'Verification code sent to the contact.',
      // Never return the code in production.
      ...(env.OTP_MODE === 'console' ? { devCode: code } : {}),
    });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /contacts/:id/confirm-verification                             */
/* ------------------------------------------------------------------ */

contactsRouter.post(
  '/:id/confirm-verification',
  asyncHandler(async (req, res) => {
    const { code } = otpSchema.parse(req.body);

    const contact = await TrustedContact.findOne({
      _id: req.params.id,
      userId: req.auth!.sub,
    }).select('+otpHash +otpExpiresAt');

    if (!contact) throw new ApiError(404, 'NOT_FOUND', 'Contact not found');
    if (!contact.otpHash || !contact.otpExpiresAt) {
      throw new ApiError(400, 'NO_OTP', 'No verification is pending for this contact');
    }
    if (contact.otpExpiresAt.getTime() < Date.now()) {
      throw new ApiError(400, 'OTP_EXPIRED', 'Verification code expired — request a new one');
    }
    if (sha256(code) !== contact.otpHash) {
      throw new ApiError(400, 'OTP_INVALID', 'Incorrect verification code');
    }

    contact.verificationStatus = 'VERIFIED';
    contact.verifiedAt = new Date();
    contact.set('otpHash', null);
    contact.set('otpExpiresAt', null);
    await contact.save();

    await audit(req, {
      action: 'CONTACT_VERIFIED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'contact',
      resourceId: contact._id.toString(),
    });

    res.json({ contact: toContact(contact) });
  }),
);

/* ------------------------------------------------------------------ */
/* POST /contacts/:id/primary                                          */
/* ------------------------------------------------------------------ */

contactsRouter.post(
  '/:id/primary',
  asyncHandler(async (req, res) => {
    const contact = await TrustedContact.findOne({
      _id: req.params.id,
      userId: req.auth!.sub,
    });
    if (!contact) throw new ApiError(404, 'NOT_FOUND', 'Contact not found');

    // Only verified contacts may be the primary emergency recipient.
    if (contact.verificationStatus !== 'VERIFIED') {
      throw new ApiError(
        409,
        'NOT_VERIFIED',
        'Verify this contact before making them the primary contact',
      );
    }

    await TrustedContact.updateMany({ userId: req.auth!.sub }, { $set: { isPrimary: false } });
    contact.isPrimary = true;
    await contact.save();

    await audit(req, {
      action: 'CONTACT_UPDATED',
      actorId: req.auth!.sub,
      actorRole: req.auth!.role,
      resourceType: 'contact',
      resourceId: contact._id.toString(),
      detail: 'set as primary contact',
    });

    res.json({ contact: toContact(contact) });
  }),
);

/** Unused helper kept for future SMS-provider verification flows. */
export function newVerificationCode(): string {
  return randomToken(4);
}

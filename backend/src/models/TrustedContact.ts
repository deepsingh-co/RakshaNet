import { Schema, model, models, type Model, type InferSchemaType, type Types } from 'mongoose';

/**
 * A trusted contact belongs to exactly one user. Only VERIFIED contacts
 * are eligible to receive emergency information (enforced in the API).
 *
 * Admins can never silently edit a user's private contacts — there is no
 * admin write path here; reads are audited where exposed.
 */
export const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const RELATIONSHIPS = [
  'MOTHER',
  'FATHER',
  'SPOUSE',
  'SIBLING',
  'FRIEND',
  'GUARDIAN',
  'COLLEAGUE',
  'NEIGHBOUR',
  'OTHER',
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

const contactSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true },
    relationship: { type: String, enum: RELATIONSHIPS, default: 'OTHER' },
    email: { type: String, default: '', lowercase: true, trim: true },

    notificationPreferences: {
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
    },

    isPrimary: { type: Boolean, default: false, index: true },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'UNVERIFIED',
      index: true,
    },
    verifiedAt: { type: Date, default: null },

    /** Hashed verification OTP — never stored in plain text. */
    otpHash: { type: String, default: null, select: false },
    otpExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

/** One phone number per owner — prevents accidental duplicates. */
contactSchema.index({ userId: 1, phone: 1 }, { unique: true });
contactSchema.index({ userId: 1, isPrimary: -1, createdAt: 1 });

export type TrustedContactDoc = InferSchemaType<typeof contactSchema> & { _id: Types.ObjectId };
export const TrustedContact =
  (models.TrustedContact as Model<InferSchemaType<typeof contactSchema>>) ??
  model('TrustedContact', contactSchema);

/** +919876543210 -> +9198****3210 — never show full numbers in lists. */
export function maskPhone(phone: string): string {
  if (phone.length <= 6) return '****';
  return `${phone.slice(0, 4)}****${phone.slice(-4)}`;
}

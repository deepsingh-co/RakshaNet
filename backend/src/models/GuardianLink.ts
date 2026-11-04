import mongoose, { Schema, model, type Model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Explicit, consent-based guardian ↔ child relationship.
 * No covert tracking: a link only becomes active after the child accepts
 * with a consent code, and either party can revoke it at any time.
 */
export const LINK_STATUSES = ['PENDING', 'VERIFIED', 'REVOKED'] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

const guardianLinkSchema = new Schema(
  {
    guardianId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    childId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: LINK_STATUSES, default: 'PENDING', index: true },
    initiatedBy: { type: String, enum: ['GUARDIAN', 'CHILD'], default: 'GUARDIAN' },

    /** Child must submit this code to accept; stored hashed with expiry. */
    consentCodeHash: { type: String, default: null, select: false },
    consentCodeExpiresAt: { type: Date, default: null, select: false },

    verifiedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: String, enum: ['GUARDIAN', 'CHILD', 'ADMIN', ''], default: '' },
  },
  { timestamps: true },
);

guardianLinkSchema.index({ guardianId: 1, childId: 1 }, { unique: true });

export type GuardianLinkDoc = InferSchemaType<typeof guardianLinkSchema> & {
  _id: Types.ObjectId;
};
export const GuardianLink =
  (mongoose.models.GuardianLink as Model<InferSchemaType<typeof guardianLinkSchema>>) ??
  model('GuardianLink', guardianLinkSchema);

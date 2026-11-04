import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Refresh tokens are stored HASHED and are rotated on every use.
 * A stolen token can be revoked server-side; reuse is detected and
 * the whole family is revoked.
 */
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: true },
);

/** TTL index: Mongo removes expired tokens automatically. */
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDoc = InferSchemaType<typeof refreshTokenSchema> & { _id: Types.ObjectId };
export const RefreshToken = model('RefreshToken', refreshTokenSchema);

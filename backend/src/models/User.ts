import mongoose, { Schema, model, type Model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Roles are strictly hierarchical in *permissions*, never inherited by
 * accident: a guardian does NOT get admin powers. Admin must be granted
 * explicitly and is audited.
 */
export const ROLES = ['USER', 'GUARDIAN', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_TYPES = ['INDIVIDUAL', 'GUARDIAN', 'CHILD'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DELETION_REQUESTED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, required: true, unique: true, trim: true, index: true },

    passwordHash: { type: String, required: true, select: false },

    preferredLanguage: { type: String, default: 'en', enum: ['en', 'hi', 'mr', 'ta', 'te', 'bn'] },
    role: { type: String, enum: ROLES, default: 'USER', index: true },
    accountType: { type: String, enum: ACCOUNT_TYPES, default: 'INDIVIDUAL', index: true },
    status: { type: String, enum: USER_STATUSES, default: 'ACTIVE', index: true },

    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },

    /** Guardian account that owns/manages this child account (verified link). */
    guardianId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    /** Denormalised convenience list; source of truth is GuardianLink. */
    childIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    lastLoginAt: { type: Date, default: null },

    /** OTP / password-reset secrets are stored hashed with expiry. */
    otpHash: { type: String, default: null, select: false },
    otpExpiresAt: { type: Date, default: null, select: false },
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpiresAt: { type: Date, default: null, select: false },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, status: 1 });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const User = (mongoose.models.User as Model<InferSchemaType<typeof userSchema>>) ?? model('User', userSchema);

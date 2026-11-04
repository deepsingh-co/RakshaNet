import type { Types } from 'mongoose';

/** Public shape of a user. NEVER include passwordHash or secrets. */
export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: string;
  role: string;
  accountType: string;
  status: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  guardianId: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

type UserLike = {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: string;
  role: string;
  accountType: string;
  status: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  guardianId?: Types.ObjectId | null;
  createdAt: Date;
  lastLoginAt?: Date | null;
};

export function toPublicUser(u: UserLike): PublicUser {
  return {
    id: u._id.toString(),
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    preferredLanguage: u.preferredLanguage,
    role: u.role,
    accountType: u.accountType,
    status: u.status,
    phoneVerified: u.phoneVerified,
    emailVerified: u.emailVerified,
    guardianId: u.guardianId ? u.guardianId.toString() : null,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt ?? null,
  };
}

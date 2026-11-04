import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Constant-ish response time for unknown accounts (anti user-enumeration). */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.9BDG1rXRjLGWCzW9hF5FfR8x0eBZ3qK';

export async function burnPasswordCheck(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}

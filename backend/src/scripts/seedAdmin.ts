import { connectDb, disconnectDb } from '../db/connect.js';
import { User } from '../models/User.js';
import { hashPassword } from '../services/password.js';

/**
 * Provision an administrator account. Admin accounts cannot be created via
 * the public registration API, so operators use this script once per
 * environment.
 *
 * Usage:
 *   npm run seed:admin -- --email admin@example.com --password 'StrongPass1' \
 *     --name 'Control Room' --phone '+919800000001'
 */

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

async function main(): Promise<void> {
  const email = (arg('email') ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = arg('password') ?? process.env.ADMIN_PASSWORD ?? '';
  const fullName = (arg('name') ?? process.env.ADMIN_NAME ?? 'Control Room Admin').trim();
  const phone = (arg('phone') ?? process.env.ADMIN_PHONE ?? '').replace(/[\s-]/g, '');

  if (!email || !password || !phone) {
    // eslint-disable-next-line no-console
    console.error(
      'Usage: npm run seed:admin -- --email <email> --password <password> --phone <phone> [--name <name>]',
    );
    process.exit(1);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    // eslint-disable-next-line no-console
    console.error('Invalid email address');
    process.exit(1);
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    // eslint-disable-next-line no-console
    console.error('Password must be at least 8 characters and contain a letter and a number');
    process.exit(1);
  }

  await connectDb();

  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) {
    if (existing.role === 'ADMIN') {
      // eslint-disable-next-line no-console
      console.log(`[seed] admin already exists: ${existing.email} (${existing._id.toString()})`);
    } else {
      // eslint-disable-next-line no-console
      console.error(
        `[seed] email/phone already belongs to a ${existing.role} account — refusing to elevate it`,
      );
      process.exitCode = 1;
    }
    await disconnectDb();
    return;
  }

  const user = await User.create({
    fullName,
    email,
    phone,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    accountType: 'INDIVIDUAL',
    status: 'ACTIVE',
    phoneVerified: true,
    emailVerified: true,
  });

  // eslint-disable-next-line no-console
  console.log(`[seed] admin created: ${user.email} (${user._id.toString()})`);
  await disconnectDb();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed:', err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});

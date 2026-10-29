import { create } from 'zustand';

/**
 * Device-local auth.
 *
 * IMPORTANT / HONEST DESIGN:
 * There is no backend yet, so accounts live only on this device
 * (localStorage) and passwords are stored as a SHA-256 hash. This is
 * NOT real security — it is a local gate + a placeholder for the real
 * backend auth (M4: Node/Express + MongoDB) in PLAN.md. It exists so the
 * flow (landing → signup/login → app) and UX are real and testable
 * offline, and so we never silently claim cloud auth we don't have.
 */

const STORAGE_KEY = 'rakshanet.auth.v1';

export interface Account {
  name: string;
  /** email or phone — used to identify the account */
  contact: string;
  /** SHA-256 hex of the password (device-local, not real security) */
  passwordHash: string;
  createdAt: number;
}

/** Currently signed-in user (never persisted beyond the stored account). */
export interface Session {
  name: string;
  contact: string;
  signedInAt: number;
}

interface StoredAuth {
  account: Account | null;
  session: Session | null;
}

const EMPTY: StoredAuth = { account: null, session: null };

function read(): StoredAuth {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    return { account: parsed.account ?? null, session: parsed.session ?? null };
  } catch {
    return EMPTY;
  }
}

function write(state: StoredAuth): StoredAuth {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — session just won't persist */
  }
  return state;
}

/** SHA-256 → hex. Uses SubtleCrypto (needs https or localhost). */
async function hashPassword(password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    // Extremely old/insecure context — fall back to a trivial (NOT secure) hash
    // so the flow still works. Never used for real security either way.
    let h = 0;
    for (let i = 0; i < password.length; i++) h = (h * 31 + password.charCodeAt(i)) | 0;
    return `fallback:${h}`;
  }
  const data = new TextEncoder().encode(password);
  const digest = await subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthState {
  account: Account | null;
  session: Session | null;
  loaded: boolean;
  load: () => void;
  signup: (input: {
    name: string;
    contact: string;
    password: string;
  }) => Promise<AuthResult>;
  login: (contact: string, password: string) => Promise<AuthResult>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  account: null,
  session: null,
  loaded: false,

  load: () => {
    const { account, session } = read();
    set({ account, session, loaded: true });
  },

  signup: async ({ name, contact, password }) => {
    if (get().account) {
      return { ok: false, error: 'An account already exists on this device. Log in instead.' };
    }
    if (!name.trim()) return { ok: false, error: 'Please enter your name.' };
    if (!contact.trim()) return { ok: false, error: 'Please enter an email or phone.' };
    if (password.length < 4) return { ok: false, error: 'Password must be at least 4 characters.' };

    const passwordHash = await hashPassword(password);
    const account: Account = {
      name: name.trim(),
      contact: contact.trim(),
      passwordHash,
      createdAt: Date.now(),
    };
    const session: Session = { name: account.name, contact: account.contact, signedInAt: Date.now() };
    const next = write({ account, session });
    set({ ...next, loaded: true });
    return { ok: true };
  },

  login: async (contact, password) => {
    const { account } = read();
    if (!account) {
      return { ok: false, error: 'No account on this device yet. Please sign up first.' };
    }
    if (account.contact.toLowerCase() !== contact.trim().toLowerCase()) {
      return { ok: false, error: 'No account found for that email/phone.' };
    }
    const passwordHash = await hashPassword(password);
    if (passwordHash !== account.passwordHash) {
      return { ok: false, error: 'Incorrect password. Please try again.' };
    }
    const session: Session = { name: account.name, contact: account.contact, signedInAt: Date.now() };
    const next = write({ account, session });
    set({ ...next, loaded: true });
    return { ok: true };
  },

  logout: () => {
    const next = write({ account: get().account, session: null });
    set(next);
  },
}));

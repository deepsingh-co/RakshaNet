import { useAuth } from '../../../store/authStore';

/**
 * Compatibility adapter for the imported advanced feature pages.
 *
 * The pages were written against a global Zustand auth store that exposed
 * `useAuthStore()` and `useAuthStore.getState()`. RakshaNet's web app keeps
 * its local session in `store/authStore`. This adapter maps that session to
 * the shape the pages expect so no page has to know about the difference.
 */
export interface AdvancedUser {
  id: string;
  name: string;
  email: string;
  role: 'USER';
}

function currentUser(): AdvancedUser | null {
  const session = useAuth.getState().session;
  if (!session) return null;
  return {
    id: session.contact,
    name: session.name,
    email: session.contact,
    role: 'USER',
  };
}

type AdvancedAuthStore = (() => { user: AdvancedUser | null }) & {
  getState: () => { user: AdvancedUser | null };
};

export const useAuthStore: AdvancedAuthStore = Object.assign(
  () => {
    const session = useAuth((s) => s.session);
    return {
      user: session
        ? {
            id: session.contact,
            name: session.name,
            email: session.contact,
            role: 'USER' as const,
          }
        : null,
    };
  },
  { getState: () => ({ user: currentUser() }) },
);

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { AuthScreen, AuthField, AuthError } from './AuthScreen';

/**
 * Sign up — create the device-local account. On success we go straight
 * into the app (the user just proved intent, no extra step).
 */
export function SignupScreen() {
  const navigate = useNavigate();
  const signup = useAuth((s) => s.signup);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signup({ name, contact, password });
    setBusy(false);
    if (res.ok) {
      navigate('/', { replace: true });
    } else {
      setError(res.error ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Set up your safety profile. Everything is stored on this device — nothing is uploaded."
      footer={
        <span>
          Already have an account?{' '}
          <a href="#/login" className="font-semibold text-brand hover:underline">
            Log in
          </a>
        </span>
      }
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <AuthError message={error} />

        <AuthField label="Your name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. Priya"
            autoComplete="name"
            required
          />
        </AuthField>

        <AuthField label="Email or phone">
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="input"
            placeholder="you@example.com or +91…"
            autoComplete="username"
            required
          />
        </AuthField>

        <AuthField label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="At least 4 characters"
            autoComplete="new-password"
            required
          />
        </AuthField>

        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary w-full py-3 text-base disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </AuthScreen>
  );
}

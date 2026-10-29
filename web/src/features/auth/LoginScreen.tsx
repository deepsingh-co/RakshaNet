import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { AuthScreen, AuthField, AuthError } from './AuthScreen';

/** Log in — verify against the device-local account. */
export function LoginScreen() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const accountExists = useAuth((s) => s.account !== null);

  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await login(contact, password);
    setBusy(false);
    if (res.ok) {
      navigate('/', { replace: true });
    } else {
      setError(res.error ?? 'Could not log in. Please try again.');
    }
  };

  return (
    <AuthScreen
      title="Welcome back"
      subtitle={
        accountExists
          ? 'Log in to reach your safety circle and trigger SOS.'
          : "You don't have an account on this device yet."
      }
      footer={
        accountExists ? (
          <span>
            New here?{' '}
            <a href="#/signup" className="font-semibold text-brand hover:underline">
              Create an account
            </a>
          </span>
        ) : (
          <a href="#/signup" className="btn btn-primary inline-block px-6 py-2.5 text-sm">
            Create an account
          </a>
        )
      }
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <AuthError message={error} />

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
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </AuthField>

        {accountExists && (
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary w-full py-3 text-base disabled:opacity-60"
          >
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        )}
      </form>
    </AuthScreen>
  );
}

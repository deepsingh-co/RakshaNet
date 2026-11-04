import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';
import { Icon } from '../components/Icons';
import { Spinner } from '../components/ui';

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'authenticated') return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(identifier.trim(), password);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Sign-in failed. Check your email/phone and password.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-hero" aria-label="About SURAKSHA AI">
        <div className="login-brand">
          <span className="brand-mark brand-mark-large">
            <Icon name="shield" size={26} />
          </span>
          <div>
            <strong>SURAKSHA AI</strong>
            <span>Women &amp; child safety network</span>
          </div>
        </div>

        <div className="login-hero-copy">
          <p className="eyebrow light">Operations console</p>
          <h1>Every second of a response matters.</h1>
          <p>
            A single command center for live incidents, trusted contacts, guardian links, and
            honest delivery tracking. Built for teams that need the truth, not reassuring
            dashboards.
          </p>
        </div>

        <ul className="login-points">
          <li>
            <Icon name="activity" size={18} />
            <span>
              <strong>Live incident feed</strong>
              Authenticated Socket.IO updates with real lifecycle state.
            </span>
          </li>
          <li>
            <Icon name="location" size={18} />
            <span>
              <strong>Location with context</strong>
              Accuracy, capture time, and stale-ping warnings — never a guessed position.
            </span>
          </li>
          <li>
            <Icon name="bell" size={18} />
            <span>
              <strong>Delivery truth</strong>
              “Sent” means the provider accepted it. “Delivered” requires a verified webhook.
            </span>
          </li>
          <li>
            <Icon name="lock" size={18} />
            <span>
              <strong>Explicit roles</strong>
              Guardians and users never inherit administrator access.
            </span>
          </li>
        </ul>

        <p className="login-hero-foot">
          Offline-created alerts are recorded as such, including the delay between the device
          and the server.
        </p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <p className="eyebrow">Secure sign in</p>
          <h2>Operator access</h2>
          <p className="login-sub">
            Use the account provisioned for you by the system operator. Administrator accounts
            cannot self-register.
          </p>

          <form onSubmit={(event) => void submit(event)}>
            <div className="field">
              <label htmlFor="identifier">Email or phone</label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="operator@example.com"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="icon-btn password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <Icon name="eye" size={17} />
                </button>
              </div>
            </div>

            {error ? (
              <div className="form-error" role="alert">
                <Icon name="alert" size={17} />
                <span>{error}</span>
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? <Spinner label="Signing in" /> : null}
              {busy ? 'Signing in…' : 'Sign in to command center'}
            </button>
          </form>

          <div className="login-foot">
            <p>
              <Icon name="lock" size={14} /> Access token stays in memory; refresh token is an
              httpOnly cookie.
            </p>
            <p className="muted small">API · {API_URL}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

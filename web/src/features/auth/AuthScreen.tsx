import type { ReactNode } from 'react';

/**
 * Shared shell for Login & Signup — calm, focused, one task per screen.
 * No bottom nav or SOS here; auth is a deliberate, separate step.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto flex h-full max-w-sm flex-col px-5 py-8">
      <a href="#/" className="mb-8 inline-flex items-center gap-2 self-start">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand" aria-hidden>
          <svg className="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
          </svg>
        </span>
        <span className="text-lg font-bold text-ink">RakshaNet</span>
      </a>

      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{subtitle}</p>

      <div className="mt-6">{children}</div>

      <div className="mt-auto pt-8 text-center text-sm text-ink-soft">{footer}</div>
    </div>
  );
}

/** Labeled form field, consistent with the app's inputs. */
export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

/** Inline error message — clear, non-punishing. */
export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand">
      {message}
    </p>
  );
}

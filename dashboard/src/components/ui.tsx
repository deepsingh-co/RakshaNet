import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import { Icon, type IconName } from './Icons';

/* ------------------------------------------------------------------ */
/* Badges                                                             */
/* ------------------------------------------------------------------ */

export type Tone = 'slate' | 'blue' | 'teal' | 'green' | 'orange' | 'amber' | 'red' | 'purple';

export function Badge({
  children,
  tone = 'slate',
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone | string;
  dot?: boolean;
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot ? <span className="badge-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const tone = role === 'ADMIN' ? 'purple' : role === 'GUARDIAN' ? 'teal' : 'blue';
  return <Badge tone={tone}>{role}</Badge>;
}

/* ------------------------------------------------------------------ */
/* Page structure                                                     */
/* ------------------------------------------------------------------ */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`.trim()}>
      {title || actions ? (
        <div className="card-head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="card-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = 'slate',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: IconName;
  tone?: Tone;
}) {
  return (
    <article className={`kpi kpi-${tone}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {icon ? (
          <span className="kpi-icon" aria-hidden="true">
            <Icon name={icon} size={19} />
          </span>
        ) : null}
      </div>
      <div className="kpi-value">{value}</div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Loading / error / empty / access                                   */
/* ------------------------------------------------------------------ */

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function LoadingBlock({ label = 'Loading secure data…' }: { label?: string }) {
  return (
    <div className="state-block">
      <Spinner label={label} />
      <p>{label}</p>
    </div>
  );
}

export function ErrorBlock({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <div className="state-block state-error" role="alert">
      <span className="state-icon">
        <Icon name="alert" size={24} />
      </span>
      <div>
        <h3>Could not load this view</h3>
        <p>{error.message}</p>
      </div>
      {onRetry ? (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyBlock({
  title,
  message,
  icon = 'shield',
  action,
}: {
  title: string;
  message: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="state-block state-empty">
      <span className="state-icon">
        <Icon name={icon} size={26} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      {action}
    </div>
  );
}

export function AccessDenied({ module }: { module: string }) {
  return (
    <div className="access-denied">
      <span className="access-icon">
        <Icon name="lock" size={30} />
      </span>
      <h2>Administrator access required</h2>
      <p>
        {module} is restricted to operator accounts with the <strong>ADMIN</strong> role.
        Guardian and user roles are never elevated automatically — access is granted only by
        provisioning an administrator account on the backend.
      </p>
      <p className="muted">
        If you believe you need access, contact the system operator who manages this
        deployment.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                         */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  pages,
  total,
  limit,
  onPage,
  noun = 'records',
}: {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
  noun?: string;
}) {
  if (total === 0) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const windowStart = Math.max(1, Math.min(page - 2, pages - 4));
  const windowEnd = Math.min(pages, windowStart + 4);
  const numbers: number[] = [];
  for (let value = windowStart; value <= windowEnd; value += 1) numbers.push(value);

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination-summary">
        {start}–{end} of {total} {noun}
      </p>
      <div className="pagination-controls">
        <button
          type="button"
          className="icon-btn"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <Icon name="chevron-left" size={17} />
        </button>
        {numbers.map((value) => (
          <button
            key={value}
            type="button"
            className={`page-btn ${value === page ? 'is-current' : ''}`}
            aria-current={value === page ? 'page' : undefined}
            onClick={() => onPage(value)}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          className="icon-btn"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <Icon name="chevron-right" size={17} />
        </button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                              */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function InlineNotice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'danger';
  children: ReactNode;
}) {
  return <div className={`inline-notice inline-${tone}`}>{children}</div>;
}

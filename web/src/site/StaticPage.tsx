import type { ReactNode } from 'react';

/**
 * Shared shell for static, public pages (About · Privacy · Contact).
 * Public — no login required. Uses the landing design language but
 * renders inside the hash router so it can be linked as #/about etc.
 */
export function StaticPage({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-page">
      <header className="sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <a href="#/" className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand" aria-hidden>
              <svg className="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
              </svg>
            </span>
            <span className="text-lg font-bold text-ink">RakshaNet</span>
          </a>
          <a href="#/" className="btn btn-quiet px-3 py-1.5 text-sm">
            ← Home
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink">{title}</h1>
        <div className="mt-6 space-y-5 leading-relaxed text-ink-soft">{children}</div>
      </main>

      <StaticFooter />
    </div>
  );
}

/** Simple shared footer with legal/nav links. */
export function StaticFooter() {
  return (
    <footer className="border-t border-line bg-card">
      <nav className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-6 text-sm font-medium text-ink-soft">
        <a href="#/" className="hover:text-ink">Home</a>
        <a href="#/about" className="hover:text-ink">About us</a>
        <a href="#/privacy" className="hover:text-ink">Privacy policy</a>
        <a href="#/contact" className="hover:text-ink">Contact us</a>
      </nav>
      <p className="pb-6 text-center text-xs text-ink-faint">© 2026 RakshaNet · Anurudh Singh</p>
    </footer>
  );
}

/** Section heading inside a static page. */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-ink">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

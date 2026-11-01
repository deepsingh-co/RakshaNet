import { StaticPage, Section } from './StaticPage';

/**
 * Contact Us — how to reach the maintainer. There is no backend form,
 * so we give real channels (email + GitHub) rather than a form that
 * pretends to send.
 */
export function ContactPage() {
  return (
    <StaticPage eyebrow="Contact us" title="Get in touch">
      <p className="text-base">
        Questions, feedback, bug reports, or collaboration — we would love to hear from you.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <ContactCard
          title="Email"
          value="deepsinghanirudh1@gmail.com"
          href="mailto:deepsinghanirudh1@gmail.com?subject=RakshaNet"
          note="Best for feedback, questions, and partnerships."
        />
        <ContactCard
          title="GitHub"
          value="deepsingh-co/RakshaNet"
          href="https://github.com/deepsingh-co/RakshaNet"
          note="Open an issue for bugs or feature requests."
        />
      </div>

      <Section heading="Before you write">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong className="text-ink">Bugs</strong> — include what you were doing, your
            browser/phone, and what you expected vs what happened.
          </li>
          <li>
            <strong className="text-ink">Feature ideas</strong> — tell us the situation you
            want solved, not just the feature.
          </li>
          <li>
            <strong className="text-ink">Security issues</strong> — please email directly
            rather than opening a public issue.
          </li>
        </ul>
      </Section>

      <Section heading="Response time">
        <p>
          RakshaNet is maintained by a small team, so responses may take a few days. For a live
          emergency, always contact your local emergency number first — RakshaNet coordinates
          with your trusted contacts, it does not replace emergency services.
        </p>
      </Section>

      <div className="rounded-2xl border border-line bg-card p-5">
        <p className="text-sm">
          <strong className="text-ink">Built by Anurudh Singh.</strong> Women &amp; Child
          Safety and Development — offline-first.
        </p>
      </div>
    </StaticPage>
  );
}

function ContactCard({
  title,
  value,
  href,
  note,
}: {
  title: string;
  value: string;
  href: string;
  note: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      className="card block p-5 transition-shadow hover:shadow-md"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{title}</p>
      <p className="mt-1 font-semibold break-words text-brand">{value}</p>
      <p className="mt-1.5 text-sm text-ink-soft">{note}</p>
    </a>
  );
}

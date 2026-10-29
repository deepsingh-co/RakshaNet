/**
 * Public landing page — answers "what is this?" in under a minute.
 * Lives at `/`; the app itself is at `/#/` (plain anchors, no router here).
 * Honesty rules apply here too: WhatsApp limitations are stated plainly.
 */
export function LandingPage() {
  return (
    <div className="min-h-full bg-page">
      <SiteHeader />

      <main>
        <Hero />
        <TrustStrip />
        <Problem />
        <Features />
        <HowItWorks />
        <HonestyBox />
        <Privacy />
        <Faq />
        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand" aria-hidden>
            <svg className="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
            </svg>
          </span>
          <span className="text-lg font-bold text-ink">RakshaNet</span>
        </div>
        <nav className="flex items-center gap-1 text-sm font-medium text-ink-soft sm:gap-4">
          <a href="#features" className="hidden px-2 hover:text-ink sm:block">Features</a>
          <a href="#how" className="hidden px-2 hover:text-ink sm:block">How it works</a>
          <a href="#faq" className="hidden px-2 hover:text-ink sm:block">FAQ</a>
          <a href="#/" className="btn btn-primary px-4 py-2 text-sm">
            Open app
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgb(220 38 38 / 0.07), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-4 py-16 text-center sm:py-24">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-safe-soft px-3 py-1 text-xs font-semibold text-safe">
          <span className="size-1.5 rounded-full bg-safe" aria-hidden />
          Women &amp; child safety · works offline
        </span>

        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-ink sm:text-5xl">
          Safety that works —{' '}
          <span className="text-brand">even when the internet doesn&rsquo;t</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
          RakshaNet helps women and children send emergency alerts — with location — to
          trusted contacts over WhatsApp and SMS. Trigger an SOS with no internet: it is
          saved instantly and handed to any channel that works.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="#/" className="btn btn-primary w-full px-8 py-3.5 text-base sm:w-auto">
            Open the app — it&rsquo;s free
          </a>
          <a href="#how" className="btn btn-quiet w-full px-8 py-3.5 text-base sm:w-auto">
            See how it works
          </a>
        </div>

        <p className="mt-4 text-xs text-ink-faint">
          No account needed · Installable on your phone · Your data stays on your device
        </p>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    ['📴', 'Works fully offline'],
    ['💬', 'WhatsApp + SMS alerts'],
    ['📍', 'Location with freshness'],
    ['🔒', 'Consent & revocation built-in'],
  ];
  return (
    <section className="border-y border-line bg-card">
      <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-4 py-5 sm:grid-cols-4">
        {items.map(([emoji, text]) => (
          <li key={text} className="flex items-center justify-center gap-2 text-center text-sm font-medium text-ink-soft">
            <span aria-hidden>{emoji}</span>
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Problem() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div className="card mx-auto max-w-3xl p-6 sm:p-10">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          Emergencies don&rsquo;t wait for network bars
        </h2>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Networks get congested exactly when hundreds of people need them. Batteries die.
          Data runs out. In those moments you still need to reach someone — and they need
          to know <strong className="text-ink">where you are</strong>.
        </p>
        <p className="mt-3 leading-relaxed text-ink-soft">
          RakshaNet is built for that moment. The alert is recorded on your phone first,
          then sent through whatever channel is available — WhatsApp if you have internet,
          plain SMS if you only have cellular service, a phone call as the last resort.
        </p>
      </div>
    </section>
  );
}

const FEATURE_CARDS: { icon: string; title: string; body: string; tint: string }[] = [
  {
    icon: 'M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z',
    title: 'Offline SOS',
    body: 'Trigger an alert with zero internet. It is saved on your device immediately and sent as soon as any channel becomes available.',
    tint: 'bg-brand-soft text-brand',
  },
  {
    icon: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20l1-4.9A8.4 8.4 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.4 8.4 8.4 0 0 1 9 8.4Z',
    title: 'WhatsApp alerts',
    body: 'A clear emergency message — type, time, coordinates, freshness — is prepared and handed to WhatsApp in one tap.',
    tint: 'bg-safe-soft text-safe',
  },
  {
    icon: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z',
    title: 'SMS & call fallback',
    body: 'No internet but cellular works? The alert goes out by SMS with tracked delivery — and a one-tap call as the last resort.',
    tint: 'bg-info-soft text-info',
  },
  {
    icon: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    title: 'Location with freshness',
    body: 'Coordinates, accuracy, and how old the fix is — always clearly labelled. Stale location is marked, never hidden.',
    tint: 'bg-warn-soft text-warn',
  },
  {
    icon: 'M9 12l2 2 4-4M12 3a9 9 0 1 0 9 9M21 3l-9 9',
    title: 'Honest delivery status',
    body: 'Queued → Prepared → Sent → Acknowledged. We never say a message was delivered when it was only prepared.',
    tint: 'bg-safe-soft text-safe',
  },
  {
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
    title: 'You are in control',
    body: 'Only consented contacts receive alerts. Revoke anyone instantly. Everything is stored on your device, and you can delete it all in one tap.',
    tint: 'bg-info-soft text-info',
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16">
      <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
        Everything you need in the moment that matters
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center leading-relaxed text-ink-soft">
        Not just a location-sharing app — a safety tool designed to keep working when
        connectivity fails.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_CARDS.map((f) => (
          <li key={f.title} className="card p-5">
            <span className={`inline-flex size-10 items-center justify-center rounded-xl ${f.tint}`} aria-hidden>
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={f.icon} />
              </svg>
            </span>
            <h3 className="mt-3 font-bold text-ink">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const STEPS: [string, string, string][] = [
  ['1', 'Hold the red button', 'One action, no menus. The alert is saved on your phone instantly — even with no internet.'],
  ['2', 'A loud alarm sounds', 'Siren and vibration to draw attention and deter — all local, all offline.'],
  ['3', 'Messages are prepared', 'WhatsApp and SMS open with your emergency message, time, and location ready to send.'],
  ['4', 'Your circle responds', 'Trusted contacts are alerted, and you see exactly what was sent, to whom, and when.'],
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-card py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">How it works</h2>
        <ol className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, title, body]) => (
            <li key={n} className="card relative p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden>
                {n}
              </span>
              <h3 className="mt-3 font-bold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function HonestyBox() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div className="card mx-auto max-w-3xl border-amber-200 bg-warn-soft p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
          <span aria-hidden>⚠️</span> An honest word about WhatsApp
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Ordinary WhatsApp sharing requires <strong className="text-ink">you to press send</strong>.
          RakshaNet opens WhatsApp with the message fully prepared — it cannot silently send
          on your behalf, and WhatsApp itself cannot deliver anything without internet.
        </p>
        <p className="mt-3 leading-relaxed text-ink-soft">
          That is why our status says <strong className="text-warn">Prepared</strong> and not
          <strong className="text-safe"> Sent</strong>. We would rather tell you the truth than
          claim an alert went out when it did not. Automated delivery is only possible through
          an approved WhatsApp Business integration with your explicit consent.
        </p>
      </div>
    </section>
  );
}

function Privacy() {
  const points: [string, string][] = [
    ['Your data stays on your device', 'Events, contacts, and settings are stored locally. Nothing is uploaded without your action.'],
    ['Contacts must consent', 'A trusted contact agrees before they ever receive an alert from you.'],
    ['Revoke anyone, instantly', 'One tap stops all future alerts and location sharing to that person.'],
    ['Location is never silent', 'Coordinates are captured only when you act — and their age and accuracy are always shown.'],
    ['Delete everything, anytime', 'One control wipes every event, contact, and setting from the device.'],
  ];
  return (
    <section className="bg-card py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">Privacy &amp; trust, by design</h2>
        <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {points.map(([title, body]) => (
            <li key={title} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-safe text-white" aria-hidden>
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="font-bold text-ink">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const FAQS: [string, string][] = [
  [
    'Does it really work without internet?',
    'Yes. Triggering an SOS, the alarm, and recording the alert all work fully offline. WhatsApp needs internet to deliver; SMS and calls work with cellular service alone.',
  ],
  [
    'Does it send WhatsApp messages automatically?',
    'No. It opens WhatsApp with your message prepared — you press send. Automatic messaging requires an approved WhatsApp Business integration and your explicit consent.',
  ],
  [
    'Will it call the police for me?',
    'No. RakshaNet alerts the trusted contacts you chose. It does not contact emergency services — in a real emergency, also call your local emergency number.',
  ],
  [
    'Is my location always being tracked?',
    'No. Coordinates are captured when you trigger an alert or start a live share you control — and the age of every fix is clearly labelled.',
  ],
  [
    'Where is my data stored?',
    'On your device. You can review and delete everything from Settings at any time.',
  ],
];

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16">
      <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">Questions, answered honestly</h2>
      <dl className="mt-10 space-y-4">
        {FAQS.map(([q, a]) => (
          <details key={q} className="card group p-5">
            <summary className="cursor-pointer select-none font-bold text-ink marker:text-ink-faint">{q}</summary>
            <p className="mt-2.5 leading-relaxed text-ink-soft">{a}</p>
          </details>
        ))}
      </dl>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-card py-16">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          Set up your safety circle — in 2 minutes
        </h2>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink-soft">
          Add the people you trust, agree on your emergency plan, and you are ready —
          online or off.
        </p>
        <a href="#/" className="btn btn-primary mt-7 inline-block px-10 py-3.5 text-base">
          Open RakshaNet
        </a>
        <p className="mt-3 text-xs text-ink-faint">Free · No account needed · Works offline</p>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line bg-page py-10">
      <div className="mx-auto max-w-5xl space-y-3 px-4 text-center">
        <p className="flex items-center justify-center gap-2 font-bold text-ink">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-brand" aria-hidden>
            <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
            </svg>
          </span>
          RakshaNet
        </p>
        <p className="text-sm text-ink-soft">Women &amp; Child Safety and Development · offline-first</p>
        <p className="mx-auto max-w-xl text-xs leading-relaxed text-ink-faint">
          RakshaNet helps you and your trusted contacts coordinate in an emergency. It does
          not replace emergency services. In immediate danger, also call your local
          emergency number.
        </p>
        <p className="text-xs text-ink-faint">© 2026 RakshaNet</p>
      </div>
    </footer>
  );
}

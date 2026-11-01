import { StaticPage, Section } from './StaticPage';

/**
 * About Us — who builds RakshaNet and why. Public, no login.
 */
export function AboutPage() {
  return (
    <StaticPage eyebrow="About us" title="Safety that doesn't quit when the network does">
      <p className="text-base">
        RakshaNet is a women &amp; child safety platform built around one stubborn belief:
        <strong className="text-ink"> an emergency alert must work even when the internet doesn&rsquo;t.</strong>
      </p>

      <Section heading="The problem">
        <p>
          Networks get congested exactly when they are needed most. Batteries die, data runs
          out, and coverage drops in the places people feel least safe. In those moments a
          normal safety app can fail silently — or worse, claim an alert was sent when it was
          not.
        </p>
      </Section>

      <Section heading="What we built">
        <p>
          RakshaNet records your SOS on your device first — instantly, offline — then hands the
          alert to whichever channel still works: WhatsApp if you have internet, plain SMS if
          you only have cellular service, a phone call as the last resort. A loud local alarm
          and vibration run entirely on the device, with no network required.
        </p>
        <p>
          Your location is captured with its accuracy and age always visible. Stale coordinates
          are labelled, never hidden.
        </p>
      </Section>

      <Section heading="What makes us different">
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong className="text-ink">Honest delivery status.</strong> We show{' '}
            <em>Queued → Prepared → Sent → Acknowledged</em>. WhatsApp hand-off is never called
            &ldquo;Sent&rdquo; — you still press send, and we say so.
          </li>
          <li>
            <strong className="text-ink">Consent-first contacts.</strong> A trusted contact
            agrees before they ever receive an alert. You can revoke anyone instantly.
          </li>
          <li>
            <strong className="text-ink">Your data stays on your device.</strong> No account
            upload, no tracking, no ads.
          </li>
        </ul>
      </Section>

      <Section heading="Who builds it">
        <p>
          RakshaNet is created and maintained by <strong className="text-ink">Anurudh Singh</strong>.
          It is currently a working web app (installable, offline-first) with a backend and
          native Android app on the roadmap.
        </p>
      </Section>

      <div className="rounded-2xl border border-amber-200 bg-warn-soft p-5">
        <p className="text-sm">
          <strong className="text-ink">Important:</strong> RakshaNet helps you and your trusted
          contacts coordinate in an emergency. It does <strong className="text-ink">not</strong>{' '}
          contact emergency services for you. In immediate danger, also call your local
          emergency number.
        </p>
      </div>
    </StaticPage>
  );
}

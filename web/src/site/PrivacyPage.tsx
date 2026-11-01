import { StaticPage, Section } from './StaticPage';

/**
 * Privacy Policy — plain-language, honest. Key truth: there is no
 * backend yet, so nothing leaves the device. Say that clearly.
 */
export function PrivacyPage() {
  return (
    <StaticPage eyebrow="Privacy policy" title="Privacy policy">
      <p className="text-sm text-ink-faint">Last updated: 1 November 2026</p>

      <p className="text-base">
        Short version: <strong className="text-ink">your data stays on your device.</strong>{' '}
        RakshaNet has no server that stores your information, no advertising trackers, and no
        third-party analytics.
      </p>

      <Section heading="What data exists on your device">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong className="text-ink">Your account</strong> — name, email or phone, and a
            hashed password, used only to sign you in on this device.
          </li>
          <li>
            <strong className="text-ink">Trusted contacts</strong> — names, phone numbers,
            relationship, and which channels you chose.
          </li>
          <li>
            <strong className="text-ink">SOS events</strong> — the type, time, optional note,
            and location of alerts you triggered.
          </li>
          <li>
            <strong className="text-ink">Delivery records</strong> — what was prepared, sent,
            or failed, per contact and per channel.
          </li>
          <li>
            <strong className="text-ink">Settings</strong> — your profile preferences.
          </li>
        </ul>
      </Section>

      <Section heading="How it is stored">
        <p>
          All of the above is stored locally in your browser&rsquo;s IndexedDB and
          localStorage. It is not uploaded anywhere. Because there is no synced backend today,
          your account and data exist <strong className="text-ink">only on this device</strong> —
          signing in on another device will not show your data.
        </p>
      </Section>

      <Section heading="Location">
        <p>
          Your coordinates are captured when you trigger an alert or ask for a location
          refresh. RakshaNet does not track you in the background. Every location record shows
          its accuracy and age, and stale fixes are labelled rather than presented as current.
        </p>
      </Section>

      <Section heading="Contacts and consent">
        <p>
          A trusted contact only receives alerts after they consent. You can revoke consent at
          any time with one tap, which immediately stops further alerts and location sharing to
          that person.
        </p>
      </Section>

      <Section heading="What we do NOT do">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>No selling or sharing your data with advertisers or data brokers.</li>
          <li>No background location tracking.</li>
          <li>No reading your contacts book — you add people manually.</li>
          <li>No silent messaging: you always press send yourself.</li>
        </ul>
      </Section>

      <Section heading="Deleting your data">
        <p>
          Settings → <strong className="text-ink">Delete all data</strong> erases every event,
          contact, delivery record, and setting from this device. You can also revoke a single
          contact at any time.
        </p>
      </Section>

      <Section heading="Passwords">
        <p>
          Your password is stored as a SHA-256 hash, never in plain text. Note that this is a
          device-local sign-in gate, not cloud authentication — a real multi-device backend
          account system is planned, and will be documented here when it ships.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          RakshaNet is designed for the safety of women and children. We do not knowingly
          collect any data from children beyond what is stored on the device they use the app
          on.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          If this policy changes, the updated version will be published in this repository
          along with the change. The &ldquo;last updated&rdquo; date above reflects the current
          version.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about privacy? Reach us on the{' '}
          <a href="#/contact" className="font-semibold text-brand hover:underline">
            contact page
          </a>
          .
        </p>
      </Section>
    </StaticPage>
  );
}

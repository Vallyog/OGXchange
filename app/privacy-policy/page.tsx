import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Ogxchange",
  description:
    "Learn how Ogxchange handles information when you use our crypto rate and conversion website.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="rates-page privacy-page" id="top">
      <header className="rates-header">
        <Link className="rates-brand" href="/" aria-label="Ogxchange home">
          <Image
            src="/ogxchange-logo.png"
            alt="Ogxchange"
            width={635}
            height={187}
            priority
          />
        </Link>
        <nav className="rates-nav" aria-label="Main navigation">
          <Link href="/#rates">Rates</Link>
          <Link href="/#converter">Convert</Link>
        </nav>
        <Link className="rates-live-label" href="/#contact">
          Contact Us
        </Link>
      </header>

      <article className="privacy-content">
        <div className="privacy-heading">
          <span className="panel-kicker">YOUR INFORMATION</span>
          <h1>Privacy Policy</h1>
          <p>Effective date: November 4, 2026</p>
        </div>

        <section className="privacy-section">
          <h2>About this policy</h2>
          <p>
            This policy explains how Ogxchange handles information when you
            visit this website. The website currently provides cryptocurrency
            market information and an estimate calculator; it does not provide
            customer accounts, accept deposits, execute trades, or make
            payouts.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Information that may be processed</h2>
          <ul>
            <li>
              When you browse the site, our hosting and security infrastructure
              may process technical connection information such as your IP
              address, browser details, requested pages, and access time to
              deliver and protect the website.
            </li>

            <li>
              If authentication services are configured for the site, essential
              session data may be processed to validate a sign-in session. The
              current website does not offer a customer sign-in or account
              feature.
            </li>
            <li>
              If you contact us using WhatsApp, Instagram, or telephone links,
              the information you choose to share is handled through those
              services or your phone provider, under their own privacy
              practices.
            </li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>How we use information</h2>
          <p>
            We use the information described above to display the website,
            retrieve and show market data, keep the service secure, and respond
            when you contact us. The converter works in your browser using the
            displayed rate; the amount you enter is not sent to our rate
            provider by the rate endpoint.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Our rates are Ogxchange rates</h2>
          <p>
            Prices shown on this website are Ogxchange&apos;s own indicative
            rates. We derive them from third-party market reference data and
            apply our own pricing adjustment. They are not a general,
            universal, or official market rate, and they may differ from rates
            shown by other exchanges or providers. A displayed rate is an
            estimate for information only, can change without notice, and is
            not a guaranteed quote or offer to buy or sell. Confirm any rate
            directly with Ogxchange before making a decision.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Service providers and external links</h2>
          <p>
            We rely on hosting and infrastructure providers to operate this
            website and supply market reference data. The site
            also links to external contact services. Those providers and
            services process information under their own terms and privacy
            policies; Ogxchange does not control their independent practices.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Retention and security</h2>
          <p>
            We do not use the website&apos;s calculator to create or retain a
            record of the amount you enter. Technical records may be retained by
            our hosting or security providers for the time needed to operate,
            troubleshoot, and protect the service. We use reasonable measures
            to protect information handled by the site, but no internet
            transmission or storage method can be guaranteed completely
            secure.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Your choices and requests</h2>
          <p>
            You can choose not to provide information when contacting us, and
            you can avoid external contact links if you do not want those
            services to process your information. You may send us a privacy
            question or request using the contact options on our{" "}
            <Link href="/#contact">home page</Link>. We will review requests in
            accordance with applicable law and may need to verify your
            identity.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Changes and contact</h2>
          <p>
            We may update this policy as the website or our practices change.
            The effective date above shows when this version was published. For
            questions about this policy, please contact Ogxchange through the
            contact options on the <Link href="/#contact">home page</Link>.
          </p>
        </section>
      </article>

      <footer className="rates-footer">
        <span>© 2026 Ogxchange</span>
        <div className="rates-footer-links">
          <Link href="/">Back to rates</Link>
          <span>Market data · For information only</span>
        </div>
      </footer>
    </main>
  );
}

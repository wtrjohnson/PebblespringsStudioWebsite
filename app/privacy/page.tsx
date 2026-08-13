import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Pebblesprings Studio",
  description: "How Pebblesprings Studio collects and uses information from this website.",
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page lower-scene scene-panel" aria-label="Pebblesprings Studio privacy policy">
      <header className="lower-topbar" aria-label="Pebblesprings Studio navigation">
        <Link className="topbar-brand" href="/" aria-label="Pebblesprings Studio home">
          <img src="/PSLogo.png" alt="" width="32" height="32" />
          <span>
            Pebblesprings
            <br />
            Studio
          </span>
        </Link>
        <nav className="lower-nav" aria-label="Privacy policy navigation">
          <Link href="/#portfolio">Work</Link>
          <Link href="/#performance">Performance</Link>
          <Link href="/#about">Priorities</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </header>

      <article className="privacy-content">
        <div className="privacy-intro">
          <p className="privacy-kicker">Privacy policy</p>
          <p className="privacy-updated">Last updated: August 12, 2026</p>
        </div>

        <div className="privacy-body">
          <p>
            This policy explains what Pebblesprings Studio collects through this website,
            why we collect it, and what you can ask us to do with it.
          </p>

          <section>
            <h2>Information you give us</h2>
            <p>We collect information when you use one of these features:</p>
            <ul>
              <li>
                <strong>Contact form:</strong> your name, email address, project or company,
                message, budget, and desired timeline.
              </li>
              <li>
                <strong>Website checker:</strong> the website URL you submit, the resulting
                scores, the referring page, and whether the check succeeded.
              </li>
              <li>
                <strong>Report or project request:</strong> your email address, message,
                request type, and the website check connected to the request. If you request
                a report, we also store the PageSpeed snapshot used to create it.
              </li>
              <li>
                <strong>Client portal:</strong> your name, email address, client account,
                project information, approvals, and project updates.
              </li>
            </ul>
          </section>

          <section>
            <h2>How we use it</h2>
            <p>We use this information to:</p>
            <ul>
              <li>Reply to project inquiries.</li>
              <li>Run the website checker and show its results.</li>
              <li>Send a requested report or follow up about a project.</li>
              <li>Provide the client portal and manage project communication.</li>
              <li>Protect the site from abuse and limit repeated website checks.</li>
              <li>Maintain and improve the site and our services.</li>
            </ul>
            <p>
              We do not sell your personal information. We do not use it for advertising.
            </p>
          </section>

          <section>
            <h2>Cookies and similar technology</h2>
            <p>
              The public site does not use advertising cookies or analytics cookies. The
              client portal uses one necessary, HTTP-only session cookie to keep you signed
              in. It expires after seven days or when the session is revoked.
            </p>
            <p>
              The website checker also uses short-lived server memory to avoid repeating the
              same performance request too often. This is not a browser cookie.
            </p>
          </section>

          <section>
            <h2>Service providers</h2>
            <p>
              We use service providers to operate parts of the site. They process information
              only as needed to provide their services:
            </p>
            <ul>
              <li>Our hosting and database providers store site and project data.</li>
              <li>PageSpeed Insights may process a submitted website URL to provide performance results.</li>
              <li>Resend may deliver client-portal login emails and requested website reports.</li>
            </ul>
            <p>
              The site also links to portfolio websites and other third-party sites. Their
              privacy policies apply when you leave this site.
            </p>
          </section>

          <section>
            <h2>Website reports</h2>
            <p>
              If you ask us to email a website report, we use your email address only to send
              that report. The report contains the submitted URL, PageSpeed scores, key
              metrics, and audit findings. The private report link expires after seven days;
              it is not a newsletter or advertising subscription.
            </p>
            <p>
              Resend processes the email for delivery. You can ask us to delete the report
              email address, stored report data, or private report record by contacting us.
            </p>
          </section>

          <section>
            <h2>How long we keep information</h2>
            <p>
              We keep contact messages, website-check requests, and client-project records
              while they are useful for responding to you, managing a project, maintaining
              business records, or meeting legal obligations. We delete or archive records
              when they are no longer needed.
            </p>
            <p>
              Portal magic links expire after 15 minutes and can be used only once. Portal
              sessions expire after seven days unless they are revoked sooner.
              Website report links expire after seven days.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              You can ask us what personal information we have about you, ask us to correct
              it, or ask us to delete it, subject to records we must keep by law. You can also
              choose not to provide optional information in the contact form.
            </p>
            <p>
              To make a request, email <a href="mailto:will@pebblesprings.co">will@pebblesprings.co</a>.
              We may need to verify your identity before completing a request.
            </p>
          </section>

          <section>
            <h2>Children</h2>
            <p>
              This site is for general audiences and is not directed to children under 13.
              We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>
              We may update this policy when the site or our data practices change. The date
              at the top of this page shows when it was last revised.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Pebblesprings Studio<br />
              <a href="mailto:will@pebblesprings.co">will@pebblesprings.co</a>
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}

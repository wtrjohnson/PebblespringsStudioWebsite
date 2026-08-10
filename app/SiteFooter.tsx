import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="global-footer" aria-label="Pebblesprings Studio footer">
      <img className="global-footer-wave" src="/FooterWavyBorder.svg" alt="" aria-hidden="true" />
      <div className="global-footer-inner">
        <Link className="global-footer-brand" href="/">
          <img src="/PSLogo.png" alt="" aria-hidden="true" />
        </Link>
        <div className="global-footer-links">
          <nav className="global-footer-group" aria-label="Footer home navigation">
            <h2>Home</h2>
            <Link href="/#portfolio">Portfolio</Link>
            <Link href="/#performance">Performance</Link>
            <Link href="/#about">Priorities</Link>
          </nav>
          <nav className="global-footer-group" aria-label="Footer support navigation">
            <h2>Support</h2>
            <a href="/contact">Contact</a>
            <a href="/portal/login">Client Portal</a>
            <a href="/privacy">Privacy Policy</a>
          </nav>
        </div>
        <div className="global-footer-actions">
          <a className="global-footer-button is-primary" href="/contact">Start a Project</a>
          <Link className="global-footer-button" href="/">Back to Top</Link>
        </div>
        <p className="global-footer-copyright">© 2026 Pebblesprings Studio</p>
      </div>
    </footer>
  );
}

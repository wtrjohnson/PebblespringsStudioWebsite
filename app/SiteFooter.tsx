export function SiteFooter() {
  return (
    <footer className="global-footer" aria-label="Pebblesprings Studio footer">
      <img className="global-footer-wave" src="/FooterWavyBorder.svg" alt="" aria-hidden="true" />
      <div className="global-footer-inner">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="global-footer-brand" href="/">
          <img src="/PSLogo.png" alt="" aria-hidden="true" />
        </a>
        <div className="global-footer-links">
          <nav className="global-footer-group" aria-label="Footer home navigation">
            <h2>Home</h2>
            <a href="/">Work</a>
            <a href="/#performance">Performance</a>
            <a href="/#about">Priorities</a>
          </nav>
          <nav className="global-footer-group" aria-label="Footer support navigation">
            <h2>Support</h2>
            <a href="/contact">Contact</a>
            <a href="/portal/login">Client Portal</a>
            <a href="mailto:will@pebblesprings.co">will@pebblesprings.co</a>
            <a href="/privacy">Privacy Policy</a>
          </nav>
        </div>
        <div className="global-footer-actions">
          <a className="global-footer-button is-primary" href="/contact">Start a Project</a>
          <a className="global-footer-button" href="/">Back to Top</a>
        </div>
        <p className="global-footer-copyright">© 2026 Pebblesprings Studio</p>
      </div>
    </footer>
  );
}

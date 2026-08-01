export function SiteFooter() {
  return (
    <footer className="global-footer" aria-label="Pebblesprings Studio footer">
      <img className="global-footer-wave" src="/FooterWavyBorder.svg" alt="" aria-hidden="true" />
      <div className="global-footer-inner">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="global-footer-brand" href="/">
          <img src="/PSLogo.png" alt="" aria-hidden="true" />
          <span>
            Pebblesprings
            <br />
            Studio
          </span>
        </a>
        <nav className="global-footer-nav" aria-label="Footer navigation">
          <a href="/contact">Contact</a>
          <a href="mailto:will@pebblesprings.co">will@pebblesprings.co</a>
        </nav>
        <span>© 2026 Pebblesprings Studio</span>
      </div>
    </footer>
  );
}

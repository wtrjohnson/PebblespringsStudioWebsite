const projects = [
  {
    eyebrow: "Federal Advocacy",
    title: "Slipstream Advocacy",
    description:
      "A compact public affairs site with a high-trust first impression and a clear route to consultation.",
    url: "Strategy / Copy / Build",
    className: "project--capitol",
  },
  {
    eyebrow: "Music Education",
    title: "Meet Albert",
    description:
      "A warm lesson library for young pianists, designed around fast browsing and confident practice.",
    url: "UX / CMS / Front End",
    className: "project--music",
  },
  {
    eyebrow: "Independent Retail",
    title: "Field & Ledger",
    description:
      "A calm commerce refresh that makes inventory, gift guides, and local pickup feel effortless.",
    url: "Shopify / Art Direction",
    className: "project--shop",
  },
];

export default function Home() {
  return (
    <main className="studio-shell">
      <aside className="studio-sidebar" aria-label="Pebblesprings Studio">
        <a className="brand" href="#top" aria-label="Pebblesprings Studio home">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-sun" />
            <span className="brand-peak brand-peak--one" />
            <span className="brand-peak brand-peak--two" />
            <span className="brand-river" />
          </span>
          <span className="brand-name">
            Pebblesprings
            <br />
            Studio
          </span>
        </a>

        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#about">About</a>
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
        </nav>

        <a className="project-cta" href="mailto:hello@pebblesprings.studio">
          <span className="cta-icon" aria-hidden="true" />
          <span>Start a project</span>
        </a>
      </aside>

      <section className="portfolio-stage" id="top" aria-labelledby="page-title">
        <div className="intro-copy" id="about">
          <p>Pebblesprings Studio designs small, sturdy websites for people who need the work to feel clear.</p>
          <h1 id="page-title">Simple sites with a point of view.</h1>
        </div>

        <div className="work-rail" id="work" aria-label="Selected work">
          {projects.map((project) => (
            <article className="work-card" key={project.title}>
              <div className={`site-preview ${project.className}`}>
                <div className="browser-top">
                  <strong>{project.title}</strong>
                  <span>{project.eyebrow}</span>
                </div>
                <div className="preview-body">
                  <div>
                    <p>{project.eyebrow}</p>
                    <h2>{project.title}</h2>
                  </div>
                  <div className="preview-actions" aria-hidden="true">
                    <span />
                    <span />
                  </div>
                </div>
                <div className="preview-detail" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="project-meta">
                <p>{project.description}</p>
                <span>{project.url}</span>
              </div>
            </article>
          ))}
        </div>

        <footer className="mobile-contact" id="contact">
          <a href="mailto:hello@pebblesprings.studio">hello@pebblesprings.studio</a>
        </footer>
      </section>
    </main>
  );
}

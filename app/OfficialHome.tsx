"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PerformanceSection } from "./LegacyHome.tsx";
import { carouselProjects } from "./portfolioData.ts";
import "./althome/althome.css";

const projects = carouselProjects.filter((project) => !project.isProposition);

const projectDescriptions: Record<string, string> = {
  "slipstream-advocacy": "We created a confident identity for a new firm, giving prospective clients a clear sense of its expertise from the start. Focused positioning and a direct website give a small team the presence and credibility of a much larger firm.",
  "albert-rozin": "We helped a family turn decades of musical work into a free, accessible digital archive. The site organizes recordings, writing, performances, and teaching materials in one library, making the collection easier to explore and share.",
  "r-johnson-piano": "We rebuilt the online presence of a longstanding, top-rated piano studio around what matters most to families: thoughtful instruction, personal attention, and a teacher they can trust. The site explains the studio's practical approach and gives prospective students a clear path from first visit to first lesson.",
  "clear-policy-strategies": "We developed a direct, credible presence for an independent policy practice with specialized expertise. Focused messaging and a restrained visual system make the firm's work easy to understand and set clear expectations for prospective clients.",
};

const priorities = [
  {
    number: "01",
    title: "Clarity",
    copy: "People should understand what you do, why it matters, and where to go next.",
  },
  {
    number: "02",
    title: "Performance",
    copy: "Your site should load quickly and hold up under real use, on every screen.",
  },
  {
    number: "03",
    title: "Durability",
    copy: "Your site should be thoughtfully built, easy to maintain, and ready to evolve as your business changes.",
  },
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function HomePage() {
  const [isMiniNavVisible, setIsMiniNavVisible] = useState(false);
  const [isMiniNavOpen, setIsMiniNavOpen] = useState(false);

  useEffect(() => {
    const updateMiniNav = () => {
      const headerHeight = document.querySelector<HTMLElement>(".alt-header")?.offsetHeight ?? 84;
      const shouldShow = window.scrollY > headerHeight;

      setIsMiniNavVisible(shouldShow);

      if (!shouldShow) {
        setIsMiniNavOpen(false);
      }
    };

    const frameId = window.requestAnimationFrame(updateMiniNav);
    window.addEventListener("scroll", updateMiniNav, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateMiniNav);
    };
  }, []);

  const startFixConversation = (message: string) => {
    window.location.assign(`/contact?message=${encodeURIComponent(message)}`);
  };

  return (
    <main className="alt-home">
      <header className="alt-header">
        <a className="alt-brand" href="#top" aria-label="Pebblesprings Studio home">
          <img src="/PSLogo.png" alt="" width="34" height="34" aria-hidden="true" />
          <span>Pebblesprings Studio</span>
        </a>
        <nav className="alt-nav" aria-label="Primary navigation">
          <a href="#work">Work</a>
          <a href="#performance">Performance</a>
          <a href="#priorities">Priorities</a>
          <Link className="alt-nav-cta" href="/contact">Start a project</Link>
        </nav>
      </header>

      <div
        className={[
          "alt-mini-nav",
          isMiniNavVisible ? "is-visible" : "",
          isMiniNavOpen ? "is-open" : "",
        ].filter(Boolean).join(" ")}
      >
        <button
          aria-expanded={isMiniNavOpen}
          aria-label={isMiniNavOpen ? "Close compact navigation" : "Open compact navigation"}
          className="alt-mini-nav-toggle"
          onClick={() => setIsMiniNavOpen((current) => !current)}
          type="button"
        >
          <img src="/PSLogo.png" alt="" width="30" height="30" aria-hidden="true" />
        </button>
        <nav className="alt-mini-nav-links" aria-label="Compact navigation">
          <a href="#work" onClick={() => setIsMiniNavOpen(false)}>Work</a>
          <a href="#performance" onClick={() => setIsMiniNavOpen(false)}>Performance</a>
          <a href="#priorities" onClick={() => setIsMiniNavOpen(false)}>Priorities</a>
          <Link href="/contact" onClick={() => setIsMiniNavOpen(false)}>Contact</Link>
        </nav>
      </div>

      <section className="alt-hero" id="top" aria-labelledby="alt-hero-title">
        <div className="alt-hero-landscape" aria-hidden="true">
          <span className="alt-mountain alt-mountain-back" />
          <span className="alt-mountain alt-mountain-front" />
        </div>
        <div className="alt-hero-heading">
          <h1 id="alt-hero-title">Make your business look as good as it is.</h1>
        </div>
        <div className="alt-hero-aside">
          <p>
            We build distinctive, high-performing websites for people doing good work.
            Clear in purpose, considered in detail, and built to last.
          </p>
          <a className="alt-text-link" href="#work">
            Selected work <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <section className="alt-work" id="work" aria-label="Selected work">
        <header className="alt-section-heading alt-work-heading">
          <div>
            <p className="alt-section-label">01 — Selected work</p>
            <h2>Websites built to make good businesses clearer, more credible, and easier to choose.</h2>
          </div>
          <p className="alt-section-note">
            Strategy, identity, and web design shaped around what each business needs
            people to understand—and remember.
          </p>
        </header>
        <div className="alt-project-list">
          {projects.map((project, index) => (
            <article className="alt-project" key={project.id}>
              <div className="alt-project-copy">
                <div>
                  <h3>{project.title}</h3>
                  {projectDescriptions[project.id] && (
                    <p className="alt-project-description">{projectDescriptions[project.id]}</p>
                  )}
                </div>
                <div className="alt-project-meta">
                  {project.scope && (
                    <ul aria-label={`${project.title} project scope`}>
                      {project.scope.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                  <a href={project.url} target="_blank" rel="noreferrer">
                    Visit live site <Arrow />
                  </a>
                </div>
              </div>
              <a
                className="alt-project-visual"
                href={project.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Visit the ${project.title} website`}
              >
                <img src={project.image} alt={`${project.title} website preview`} loading={index > 0 ? "lazy" : "eager"} />
                <span>View project <Arrow /></span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="alt-performance" id="performance" aria-labelledby="alt-performance-title">
        <div className="alt-performance-intro">
          <div>
            <p className="alt-section-label">02 — Website performance</p>
            <h2 id="alt-performance-title">The details you don&apos;t see still matter.</h2>
          </div>
          <p>
            We monitor the websites we build for speed, accessibility, technical quality,
            and search visibility—and you can check your own site below.
          </p>
        </div>
        <PerformanceSection onStartFix={startFixConversation} variant="editorial" />
      </section>

      <section className="alt-priorities" id="priorities" aria-labelledby="alt-priorities-title">
        <header className="alt-section-heading alt-priorities-heading">
          <div>
            <p className="alt-section-label">03 — What guides the work</p>
            <h2 id="alt-priorities-title">Useful first. Beautiful throughout.</h2>
          </div>
        </header>
        <div className="alt-priority-grid">
          {priorities.map((priority) => (
            <article key={priority.number}>
              <p>{priority.number}</p>
              <h3>{priority.title}</h3>
              <p>{priority.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="alt-contact" aria-labelledby="alt-contact-title">
        <p className="alt-section-label">04 — Start a project</p>
        <h2 id="alt-contact-title">Let&apos;s make something worth remembering.</h2>
        <Link href="/contact">
          Start a conversation <Arrow />
        </Link>
      </section>

      <footer className="alt-footer">
        <p>© 2026 Pebblesprings Studio</p>
        <nav aria-label="Footer navigation">
          <a href="#top">Top</a>
          <Link href="/portal/login">Client portal</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </footer>
    </main>
  );
}

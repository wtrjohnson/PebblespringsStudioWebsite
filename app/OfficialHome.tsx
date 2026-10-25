"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PerformanceSection } from "./LegacyHome.tsx";
import { carouselProjects } from "./portfolioData.ts";
import "./althome/althome.css";

const projects = carouselProjects.filter((project) => !project.isProposition);
const gallerySlides = [
  { project: projects[projects.length - 1], projectIndex: projects.length - 1, isClone: true, key: "project-clone-last" },
  ...projects.map((project, projectIndex) => ({ project, projectIndex, isClone: false, key: project.id })),
  { project: projects[0], projectIndex: 0, isClone: true, key: "project-clone-first" },
];

const projectDescriptions: Record<string, string> = {
  "slipstream-advocacy": "We created a confident identity for a new firm to establish trust fast. Focused positioning and a direct website give a small team the presence and credibility of a much larger firm.",
  "albert-rozin": "We helped a family turn decades of musical work into a free, accessible digital archive. The site organizes recordings, writing, performances, and teaching materials in one library, making the collection easier to explore and share with students of all ages.",
  "r-johnson-piano": "We rebuilt the online presence of a longstanding, top-rated piano studio around what matters most to families: thoughtful instruction, personal attention, and a teacher they can trust. The site explains the studio's practical approach and gives prospective students a clear path from first inquire to first lesson.",
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
  return <span className="alt-arrow" aria-hidden="true" />;
}

export default function HomePage() {
  const [isMiniNavVisible, setIsMiniNavVisible] = useState(false);
  const [isMiniNavOpen, setIsMiniNavOpen] = useState(false);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const projectListRef = useRef<HTMLDivElement>(null);
  const activeProjectIndexRef = useRef(0);
  const hasInteractedWithProjects = useRef(false);
  const projectScrollSettleTimer = useRef<number | undefined>(undefined);

  const setActiveProject = (index: number) => {
    const normalizedIndex = (index + projects.length) % projects.length;
    if (normalizedIndex !== activeProjectIndexRef.current) {
      activeProjectIndexRef.current = normalizedIndex;
      setActiveProjectIndex(normalizedIndex);
    }
  };

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

  useEffect(() => {
    const projectList = projectListRef.current;

    if (!projectList) {
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let advanceTimer: number | undefined;

    const clearAdvanceTimer = () => {
      if (advanceTimer) {
        window.clearTimeout(advanceTimer);
        advanceTimer = undefined;
      }
    };

    const scheduleAdvance = () => {
      if (!mobileQuery.matches || reducedMotionQuery.matches || hasInteractedWithProjects.current || advanceTimer) {
        return;
      }

      advanceTimer = window.setTimeout(() => {
        if (!hasInteractedWithProjects.current) {
          moveToProject(activeProjectIndexRef.current + 1, false);
        }
      }, 4800);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          scheduleAdvance();
        } else {
          clearAdvanceTimer();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(projectList);

    return () => {
      clearAdvanceTimer();
      observer.disconnect();
    };
  }, [activeProjectIndex]);

  useEffect(() => {
    const projectList = projectListRef.current;

    if (!projectList) {
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const alignRail = () => {
      if (mobileQuery.matches) {
        projectList.scrollTo({ left: projectList.clientWidth * (activeProjectIndexRef.current + 1), behavior: "auto" });
      }
    };

    const frameId = window.requestAnimationFrame(alignRail);
    window.addEventListener("resize", alignRail);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", alignRail);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (projectScrollSettleTimer.current) {
        window.clearTimeout(projectScrollSettleTimer.current);
      }
    };
  }, []);

  const startFixConversation = (message: string) => {
    window.location.assign(`/contact?message=${encodeURIComponent(message)}`);
  };

  const stopProjectAutoplay = () => {
    hasInteractedWithProjects.current = true;
  };

  const moveToProject = (index: number, shouldStopAutoplay = true) => {
    if (shouldStopAutoplay) {
      stopProjectAutoplay();
    }

    const projectList = projectListRef.current;

    if (!projectList) {
      return;
    }

    const targetIndex = (index + projects.length) % projects.length;
    const currentIndex = activeProjectIndexRef.current;
    const wrapsForward = currentIndex === projects.length - 1 && targetIndex === 0;
    const wrapsBackward = currentIndex === 0 && targetIndex === projects.length - 1;
    const physicalIndex = wrapsForward
      ? projects.length + 1
      : wrapsBackward
        ? 0
        : targetIndex + 1;

    setActiveProject(targetIndex);
    projectList.scrollTo({
      left: projectList.clientWidth * physicalIndex,
      behavior: "smooth",
    });
  };

  const updateActiveProject = () => {
    const projectList = projectListRef.current;

    if (!projectList || !window.matchMedia("(max-width: 640px)").matches) {
      return;
    }

    const physicalIndex = Math.round(projectList.scrollLeft / projectList.clientWidth);
    const projectIndex = physicalIndex === 0
      ? projects.length - 1
      : physicalIndex === projects.length + 1
        ? 0
        : physicalIndex - 1;

    setActiveProject(projectIndex);

    if (projectScrollSettleTimer.current) {
      window.clearTimeout(projectScrollSettleTimer.current);
    }

    projectScrollSettleTimer.current = window.setTimeout(() => {
      if (physicalIndex === 0 || physicalIndex === projects.length + 1) {
        projectList.scrollTo({
          left: projectList.clientWidth * (projectIndex + 1),
          behavior: "auto",
        });
      }
    }, 120);
  };

  const previousProjectIndex = (activeProjectIndex + projects.length - 1) % projects.length;
  const nextProjectIndex = (activeProjectIndex + 1) % projects.length;

  const renderProject = (
    project: typeof projects[number],
    index: number,
    isClone: boolean,
  ) => (
    <article
      aria-hidden={isClone || undefined}
      className={["alt-project", isClone ? "is-mobile-clone" : ""].filter(Boolean).join(" ")}
      key={isClone ? `clone-${project.id}-${index}` : project.id}
    >
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
          {isClone ? (
            <span className="alt-project-link-placeholder">Visit live site <Arrow /></span>
          ) : (
            <a href={project.url} target="_blank" rel="noreferrer">
              Visit live site <Arrow />
            </a>
          )}
        </div>
      </div>
      {isClone ? (
        <div className="alt-project-visual" aria-hidden="true">
          <img src={project.image} alt="" loading="lazy" />
          <span>View project <Arrow /></span>
        </div>
      ) : (
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
      )}
    </article>
  );

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
          <img src="/hero-halftone-mountain-wide.png" alt="" />
        </div>
        <div className="alt-hero-heading">
          <h1 id="alt-hero-title">Make your business look as good as it is.</h1>
        </div>
        <div className="alt-hero-aside">
          <p>
            We build distinctive, high-performing websites.
            Clear in purpose, considered in detail, and built to last.
          </p>
          <a className="alt-text-link" href="#work">
            Selected work <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <section className="alt-work" id="work" aria-label="Our work">
        <header className="alt-work-title">
          <h2>Our Work</h2>
        </header>
        <div
          id="project-gallery"
          className="alt-project-list"
          onFocusCapture={stopProjectAutoplay}
          onPointerDown={stopProjectAutoplay}
          onScroll={updateActiveProject}
          ref={projectListRef}
        >
          {gallerySlides.map(({ project, projectIndex, isClone }) => renderProject(project, projectIndex, isClone))}
        </div>
        <div
          className="alt-project-gallery-controls"
          aria-label="Project gallery controls"
          onFocusCapture={stopProjectAutoplay}
        >
          <button
            aria-label={`Previous project: ${projects[previousProjectIndex].title}`}
            className="alt-project-gallery-arrow alt-project-gallery-arrow-previous"
            onClick={() => moveToProject(previousProjectIndex)}
            type="button"
          >
            <span className="alt-gallery-chevron" aria-hidden="true" />
          </button>
          <div className="alt-project-gallery-picker" aria-label="Choose a project">
            {projects.map((project, index) => (
              <button
                aria-controls="project-gallery"
                aria-current={activeProjectIndex === index ? "true" : undefined}
                aria-label={`View ${project.title}`}
                className={activeProjectIndex === index ? "is-active" : undefined}
                key={project.id}
                onClick={() => moveToProject(index)}
                type="button"
              >
                {String(index + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
          <button
            aria-label={`Next project: ${projects[nextProjectIndex].title}`}
            className="alt-project-gallery-arrow alt-project-gallery-arrow-next"
            onClick={() => moveToProject(nextProjectIndex)}
            type="button"
          >
            <span className="alt-gallery-chevron" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="alt-performance" id="performance" aria-labelledby="alt-performance-title">
        <div className="alt-performance-intro">
          <div>
            <h2 id="alt-performance-title">Performance Matters</h2>
          </div>
          <p>
            We monitor our clients website for speed, accessibility, technical quality,
            and search visibility to ensure top performance. Check how your site compares below.
          </p>
        </div>
        <PerformanceSection onStartFix={startFixConversation} variant="editorial" />
      </section>

      <section className="alt-priorities" id="priorities" aria-labelledby="alt-priorities-title">
        <header className="alt-section-heading alt-priorities-heading">
          <div>
            <h2 id="alt-priorities-title">Our guiding principles</h2>
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
        <h2 id="alt-contact-title">Let&apos;s make something worth remembering.</h2>
        <Link className="alt-contact-action" href="/contact">
          Start a conversation <Arrow />
        </Link>
      </section>

      <footer className="alt-footer">
        <p>© 2026 Pebblesprings Studio</p>
        <nav aria-label="Footer navigation">
          <a href="#top">Top</a>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </footer>
    </main>
  );
}

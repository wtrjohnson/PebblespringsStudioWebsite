"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, MouseEvent } from "react";
import type { PortfolioProject } from "./portfolioData.ts";
import { carouselProjects } from "./portfolioData.ts";
import { expandedCardLayouts } from "./expandedCardLayouts.ts";

const featuredProjects = carouselProjects.filter((project) => !project.isProposition);

const ROTATION_MS = 5200;
const HOVER_INTENT_MS = 150;

type ActivationMode = "pointer" | "keyboard" | "touch" | null;

type ExpandedState = {
  projectId: string | null;
  activationMode: ActivationMode;
};

export function TestHeroGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState<ExpandedState>({ projectId: null, activationMode: null });
  const isPausedRef = useRef(false);
  const rotationTimeoutRef = useRef<number | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const expandedProjectId = expanded.projectId;
  const isExpanded = expandedProjectId !== null;
  const activeProject = featuredProjects[activeIndex];

  const stackRef = useRef<HTMLDivElement | null>(null);
  const [stackHeight, setStackHeight] = useState<number | null>(null);

  const [settledProject, setSettledProject] = useState(activeProject);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const crossfadeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeProject.id === settledProject.id) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsCrossfading(true);
    });

    if (crossfadeTimeoutRef.current !== null) {
      window.clearTimeout(crossfadeTimeoutRef.current);
    }

    crossfadeTimeoutRef.current = window.setTimeout(() => {
      setSettledProject(activeProject);
      setIsCrossfading(false);
      crossfadeTimeoutRef.current = null;
    }, 460);

    return () => {
      window.cancelAnimationFrame(frameId);
      if (crossfadeTimeoutRef.current !== null) {
        window.clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
    };
  }, [activeProject, settledProject]);

  useEffect(() => {
    return () => {
      if (crossfadeTimeoutRef.current !== null) {
        window.clearTimeout(crossfadeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const stack = stackRef.current;

    if (!stack) {
      return;
    }

    const measure = () => {
      if (isExpanded) {
        return;
      }

      // Below 1100px the stack is `height: auto` and the peek is gone, so a
      // pinned pixel height only fights the CSS (and flashes on rotate).
      if (window.matchMedia("(max-width: 1100px)").matches) {
        setStackHeight(null);
        return;
      }

      setStackHeight(stack.offsetHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(stack);

    return () => observer.disconnect();
  }, [isExpanded]);

  function clearRotationTimeout() {
    if (rotationTimeoutRef.current !== null) {
      window.clearTimeout(rotationTimeoutRef.current);
      rotationTimeoutRef.current = null;
    }
  }

  function scheduleRotation() {
    if (isPausedRef.current) {
      return;
    }

    clearRotationTimeout();
    rotationTimeoutRef.current = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % featuredProjects.length);
    }, ROTATION_MS);
  }

  useEffect(() => {
    if (isExpanded) {
      clearRotationTimeout();
      return;
    }

    scheduleRotation();
    return clearRotationTimeout;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, isExpanded]);

  useEffect(() => {
    return () => {
      clearRotationTimeout();
      if (hoverTimeoutRef.current !== null) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  function pauseRotation() {
    isPausedRef.current = true;
    clearRotationTimeout();
  }

  function resumeRotation() {
    isPausedRef.current = false;
    scheduleRotation();
  }

  function canHover() {
    return window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1101px)").matches;
  }

  function clearHoverTimeout() {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }

  function expandProject(projectId: string, activationMode: ActivationMode) {
    pauseRotation();
    setExpanded({ projectId, activationMode });
  }

  function collapseProject() {
    clearHoverTimeout();
    setExpanded({ projectId: null, activationMode: null });
    resumeRotation();
  }

  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        collapseProject();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  function handlePointerEnter() {
    if (!canHover()) {
      return;
    }

    clearHoverTimeout();
    pauseRotation();
    hoverTimeoutRef.current = window.setTimeout(() => {
      expandProject(activeProject.id, "pointer");
    }, HOVER_INTENT_MS);
  }

  function handlePointerLeave() {
    clearHoverTimeout();

    if (expanded.activationMode === "pointer") {
      collapseProject();
      return;
    }

    if (!isExpanded) {
      resumeRotation();
    }
  }

  function handleFocus(event: FocusEvent<HTMLElement>) {
    if (!canHover()) {
      return;
    }

    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }

    expandProject(activeProject.id, "keyboard");
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }

    if (expanded.activationMode === "keyboard") {
      collapseProject();
    }
  }

  function handlePreviewClick(event: MouseEvent<HTMLAnchorElement>) {
    if (canHover()) {
      return;
    }

    // The expanded overlay is display:none below 1100px, so expanding there
    // swallows the tap and leaves the rail disabled with nothing to show.
    // Let the tap follow the link to the live site instead.
    if (window.matchMedia("(max-width: 1100px)").matches) {
      return;
    }

    event.preventDefault();

    if (expandedProjectId !== activeProject.id) {
      expandProject(activeProject.id, "touch");
    } else {
      collapseProject();
    }
  }

  function renderStatement(project: PortfolioProject) {
    return (project.statement ?? project.eyebrow).split("\n").map((line) => (
      <span key={line}>{line}</span>
    ));
  }

  function blockStyle(block?: { top?: string; left?: string; right?: string; bottom?: string; maxWidth?: string }) {
    if (!block) {
      return undefined;
    }

    return {
      top: block.top,
      left: block.left,
      right: block.right,
      bottom: block.bottom,
      maxWidth: block.maxWidth,
    } as CSSProperties;
  }

  function renderExpandedMedia(project: PortfolioProject) {
    const layout = expandedCardLayouts[project.id];

    if (layout) {
      return layout.media.map((item) => (
        <span
          className="test-hero-media-item"
          key={item.id}
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            bottom: item.bottom,
            width: item.width,
            height: item.height,
            zIndex: item.zIndex,
          } as CSSProperties}
        >
          <img src={item.src} alt={item.alt} />
        </span>
      ));
    }

    const fallbackItem = (project.media ?? [])[0];

    if (!fallbackItem) {
      return null;
    }

    return (
      <span className="test-hero-preview-image">
        <img src={fallbackItem.src} alt={fallbackItem.alt} />
      </span>
    );
  }

  const nextIndex = (activeIndex + 1) % featuredProjects.length;
  const nextProject = featuredProjects[nextIndex];

  function jumpToProject(index: number) {
    if (isExpanded) {
      return;
    }

    clearHoverTimeout();
    isPausedRef.current = false;
    setActiveIndex(index);
  }

  return (
    <div className="test-hero-gallery">
      <div
        className={`test-hero-stack${isExpanded ? " is-project-expanded" : ""}`}
        ref={stackRef}
        style={{ "--stack-height": stackHeight ? `${stackHeight}px` : "auto" } as CSSProperties}
      >
      <article
        className={`test-hero-frame test-hero-frame-main work-card work-card-project${isExpanded ? " is-expanded" : ""}`}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <a
          aria-label={`Open ${activeProject.title} website in a new tab`}
          className="site-preview"
          href={activeProject.url}
          onClick={handlePreviewClick}
          rel="noopener noreferrer"
          target="_blank"
        >
          <img
            className="portfolio-screenshot"
            src={settledProject.image}
            alt={`${settledProject.title} website screenshot`}
          />
          {isCrossfading && (
            <img
              key={activeProject.id}
              className="portfolio-screenshot portfolio-screenshot-incoming"
              src={activeProject.image}
              alt={`${activeProject.title} website screenshot`}
            />
          )}
          <div className="portfolio-overlay" aria-hidden="true">
            <img className="portfolio-logo" src={activeProject.logo} alt="" />
            <span>{activeProject.title}</span>
          </div>
        </a>

        <a
          aria-label={`View ${activeProject.title} case study`}
          className={`expanded-project-preview${activeProject.expandedBackground && activeProject.expandedBackground !== "#000000" ? " test-hero-light-bg" : ""}`}
          href={activeProject.url}
          rel="noopener noreferrer"
          style={{
            "--expanded-background": activeProject.expandedBackground ?? "#000000",
            "--statement-color": activeProject.statementColor ?? "#ffffff",
          } as CSSProperties}
          target="_blank"
        >
          <span className="expanded-copy" style={blockStyle(expandedCardLayouts[activeProject.id]?.copy)}>
            <span className="expanded-eyebrow">
              {activeProject.number ?? String(activeIndex + 1).padStart(2, "0")} / Selected Work
            </span>
            <span className="expanded-title">{activeProject.title}</span>
            <span className="expanded-statement">{renderStatement(activeProject)}</span>
          </span>

          {renderExpandedMedia(activeProject)}

          <span className="expanded-scope" style={blockStyle(expandedCardLayouts[activeProject.id]?.scope)}>
            <span>Scope:</span>
            {(activeProject.scope ?? []).map((item) => (
              <strong key={item}>{item}</strong>
            ))}
          </span>

          <span className="expanded-cta" style={blockStyle(expandedCardLayouts[activeProject.id]?.cta)}>
            View case study →
          </span>
        </a>
      </article>

      <button
        aria-label={`Show ${nextProject.title}`}
        className="test-hero-frame test-hero-frame-peek"
        onClick={() => jumpToProject(nextIndex)}
        type="button"
      >
        <img src={nextProject.image} alt="" />
      </button>
      </div>

      <div className="test-hero-rail-row">
        <span className="test-hero-gallery-label">Recent Work</span>
        <div className={`test-hero-rail-indicator${isExpanded ? " is-paused" : ""}`} aria-label="Portfolio piece">
          {featuredProjects.map((project, index) => (
            <button
              aria-current={activeIndex === index}
              aria-label={`Show ${project.title}`}
              className={[
                index < activeIndex ? "is-complete" : "",
                activeIndex === index ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={project.id}
              disabled={isExpanded}
              onClick={() => jumpToProject(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

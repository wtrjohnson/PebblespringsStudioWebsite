"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, MouseEvent, PointerEvent } from "react";
import type { PortfolioProject } from "./portfolioData.ts";
import { carouselProjects as allPortfolioProjects } from "./portfolioData.ts";
import { animateScroll } from "./scrollMotion.ts";

const ROTATION_MS = 5200;
const INTRO_ROTATION_MS = 8200;
const HOVER_INTENT_MS = 150;
const CARD_SCROLL_OFFSET = 66;

type ExpandedProjectState = {
  projectId: string | null;
  activationMode: "pointer" | "keyboard" | "mobile" | null;
};

const carouselProjects = allPortfolioProjects.filter((project) => !project.isProposition);

export function PortfolioCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedProject, setExpandedProject] = useState<ExpandedProjectState>({
    projectId: null,
    activationMode: null,
  });
  const [expandedAnchorIndex, setExpandedAnchorIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const scrollFrameRef = useRef<number | null>(null);
  const autoScrollCancelRef = useRef<(() => void) | null>(null);
  const isAutoScrollingRef = useRef(false);
  const autoScrollTimeoutRef = useRef<number | null>(null);
  const expandedAlignmentFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const remainingMsRef = useRef(ROTATION_MS);
  const rotationStartedAtRef = useRef(0);
  const rotationTimeoutRef = useRef<number | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const lockedScrollLeftRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const expandedProjectId = expandedProject.projectId;
  const isCarouselLocked = expandedProjectId !== null;
  const expandedPreviewIndex = expandedProjectId
    ? carouselProjects.findIndex((project) => project.id === expandedProjectId)
    : -1;
  const expandedPreviewProject = expandedPreviewIndex >= 0 ? carouselProjects[expandedPreviewIndex] : null;
  const isMobileSheetOpen = expandedProject.activationMode === "mobile" && expandedPreviewProject !== null;

  function getRotationDelay(index: number) {
    return carouselProjects[index]?.isProposition ? INTRO_ROTATION_MS : ROTATION_MS;
  }

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    const card = cardRefs.current[activeIndex];

    if (!scrollContainer || !card || isCarouselLocked) {
      return;
    }

    isAutoScrollingRef.current = true;

    autoScrollCancelRef.current?.();
    autoScrollCancelRef.current = animateScroll({
      target: scrollContainer,
      axis: "left",
      to: card.offsetLeft - CARD_SCROLL_OFFSET,
      duration: 760,
    });

    if (autoScrollTimeoutRef.current !== null) {
      window.clearTimeout(autoScrollTimeoutRef.current);
    }

    autoScrollTimeoutRef.current = window.setTimeout(() => {
      isAutoScrollingRef.current = false;
      autoScrollCancelRef.current = null;
    }, 700);
  }, [activeIndex, isCarouselLocked]);

  function clearRotationTimeout() {
    if (rotationTimeoutRef.current !== null) {
      window.clearTimeout(rotationTimeoutRef.current);
      rotationTimeoutRef.current = null;
    }
  }

  function scheduleRotation(delay = remainingMsRef.current) {
    if (isPausedRef.current) {
      return;
    }

    clearRotationTimeout();
    rotationStartedAtRef.current = window.performance.now();
    rotationTimeoutRef.current = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % carouselProjects.length);
    }, delay);
  }

  function pauseRotation() {
    if (isPausedRef.current) {
      return;
    }

    isPausedRef.current = true;
    setIsPaused(true);

    if (rotationTimeoutRef.current !== null) {
      const elapsed = window.performance.now() - rotationStartedAtRef.current;
      remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
      clearRotationTimeout();
    }
  }

  function resumeRotation() {
    if (!isPausedRef.current || isCarouselLocked) {
      return;
    }

    isPausedRef.current = false;
    setIsPaused(false);
    scheduleRotation();
  }

  useEffect(() => {
    if (isCarouselLocked) {
      clearRotationTimeout();
      return;
    }

    if (isPausedRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
    }

    remainingMsRef.current = getRotationDelay(activeIndex);
    scheduleRotation(remainingMsRef.current);

    return clearRotationTimeout;
  }, [activeIndex, isCarouselLocked]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      if (autoScrollTimeoutRef.current !== null) {
        window.clearTimeout(autoScrollTimeoutRef.current);
      }

      if (expandedAlignmentFrameRef.current !== null) {
        window.cancelAnimationFrame(expandedAlignmentFrameRef.current);
      }

      autoScrollCancelRef.current?.();

      clearRotationTimeout();
      clearHoverTimeout();
    };
  }, []);

  useEffect(() => {
    if (!isCarouselLocked) {
      return;
    }

    const scrollContainer = scrollRef.current;

    if (!scrollContainer) {
      return;
    }

    lockedScrollLeftRef.current = scrollContainer.scrollLeft;
    pauseRotation();
  }, [isCarouselLocked]);

  useEffect(() => {
    if (isCarouselLocked) {
      return;
    }

    const scrollContainer = scrollRef.current;

    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollLeft = lockedScrollLeftRef.current;
  }, [isCarouselLocked]);

  useEffect(() => {
    if (!expandedProjectId) {
      return;
    }

    function getExpandedAnchorCard() {
      return expandedAnchorIndex === null ? null : cardRefs.current[expandedAnchorIndex];
    }

    function handleDocumentPointerMove(event: globalThis.PointerEvent) {
      if (expandedProject.activationMode !== "pointer") {
        return;
      }

      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      const activeCard = getExpandedAnchorCard();

      if (!activeCard) {
        return;
      }

      const previewRect =
        activeCard.querySelector(".expanded-project-preview")?.getBoundingClientRect() ??
        activeCard.getBoundingClientRect();
      const isInsideNextButtonSafeZone =
        event.clientX >= previewRect.right &&
        event.clientX <= previewRect.right + 172 &&
        event.clientY >= previewRect.top &&
        event.clientY <= previewRect.bottom;
      const indicatorRect = document.querySelector(".rail-indicator")?.getBoundingClientRect();
      const isInsideIndicatorSafeZone = indicatorRect
        ? event.clientX >= indicatorRect.left - 16 &&
          event.clientX <= indicatorRect.right + 16 &&
          event.clientY >= indicatorRect.top - 18 &&
          event.clientY <= indicatorRect.bottom + 18
        : false;

      if (
        !activeCard.contains(target) &&
        !isInsideNextButtonSafeZone &&
        !isInsideIndicatorSafeZone
      ) {
        collapseProject();
        resumeRotation();
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        collapseProject();
      }
    }

    document.addEventListener("pointermove", handleDocumentPointerMove);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("pointermove", handleDocumentPointerMove);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [expandedAnchorIndex, expandedProject.activationMode, expandedProjectId]);

  function syncActiveToScroll() {
    const scrollContainer = scrollRef.current;

    if (!scrollContainer || isCarouselLocked || isAutoScrollingRef.current || scrollFrameRef.current !== null) {
      return;
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const nextIndex = cardRefs.current.reduce((closestIndex, card, index) => {
        if (!card) {
          return closestIndex;
        }

        const currentCard = cardRefs.current[closestIndex];

        if (!currentCard) {
          return index;
        }

        const currentDistance = Math.abs(scrollContainer.scrollLeft - currentCard.offsetLeft + CARD_SCROLL_OFFSET);
        const nextDistance = Math.abs(scrollContainer.scrollLeft - card.offsetLeft + CARD_SCROLL_OFFSET);

        return nextDistance < currentDistance ? index : closestIndex;
      }, 0);

      setActiveIndex(nextIndex);
      scrollFrameRef.current = null;
    });
  }

  function clearHoverTimeout() {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }

  function centerExpandedCard(index: number) {
    const scrollContainer = scrollRef.current;
    const card = cardRefs.current[index];

    if (!scrollContainer || !card) {
      return;
    }

    const centeredScrollLeft = card.offsetLeft - (scrollContainer.clientWidth - card.offsetWidth) / 2;
    const targetScrollLeft = Math.min(
      Math.max(0, centeredScrollLeft),
      Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth),
    );

    scrollContainer.scrollLeft = targetScrollLeft;
  }

  function scheduleExpandedCardCenter(index: number) {
    if (expandedAlignmentFrameRef.current !== null) {
      window.cancelAnimationFrame(expandedAlignmentFrameRef.current);
    }

    let startedAt = 0;
    const trackCenter = (timestamp: number) => {
      if (!startedAt) {
        startedAt = timestamp;
      }

      centerExpandedCard(index);

      if (timestamp - startedAt < 720) {
        expandedAlignmentFrameRef.current = window.requestAnimationFrame(trackCenter);
      } else {
        expandedAlignmentFrameRef.current = null;
      }
    };

    expandedAlignmentFrameRef.current = window.requestAnimationFrame(trackCenter);
  }

  function expandProject(projectId: string, activationMode: ExpandedProjectState["activationMode"], anchorIndex: number) {
    const scrollContainer = scrollRef.current;

    if (scrollContainer) {
      lockedScrollLeftRef.current = scrollContainer.scrollLeft;
    }

    pauseRotation();
    setExpandedAnchorIndex(anchorIndex);
    setExpandedProject({ projectId, activationMode });

    if (activationMode === "pointer" || activationMode === "keyboard") {
      scheduleExpandedCardCenter(anchorIndex);
    }
  }

  function openMobileProject(projectId: string, anchorIndex: number) {
    expandProject(projectId, "mobile", anchorIndex);
  }

  function collapseProject() {
    clearHoverTimeout();
    setExpandedAnchorIndex(null);
    setExpandedProject({ projectId: null, activationMode: null });
  }

  function canHover() {
    return window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1101px)").matches;
  }

  function isActiveProject(index: number) {
    return activeIndex === index;
  }

  function isOnDeckProject(index: number) {
    return index === activeIndex + 1 || index === activeIndex - 1;
  }

  function isNextProject(index: number) {
    return index === (activeIndex + 1) % carouselProjects.length;
  }

  function activateCarouselIndex(index: number) {
    remainingMsRef.current = getRotationDelay(index);
    setActiveIndex(index);
  }

  function getNextExpandableProjectIndex(index: number) {
    const expandableIndexes = carouselProjects
      .map((project, projectIndex) => (project.isProposition ? -1 : projectIndex))
      .filter((projectIndex) => projectIndex >= 0);
    const currentPosition = expandableIndexes.indexOf(index);

    if (currentPosition === -1) {
      return expandableIndexes[0] ?? index;
    }

    return expandableIndexes[(currentPosition + 1) % expandableIndexes.length] ?? index;
  }

  function getPreviousExpandableProjectIndex(index: number) {
    const expandableIndexes = carouselProjects
      .map((project, projectIndex) => (project.isProposition ? -1 : projectIndex))
      .filter((projectIndex) => projectIndex >= 0);
    const currentPosition = expandableIndexes.indexOf(index);

    if (currentPosition <= 0) {
      return expandableIndexes[expandableIndexes.length - 1] ?? index;
    }

    return expandableIndexes[currentPosition - 1] ?? index;
  }

  function showNextExpandedProject() {
    const nextIndex = getNextExpandableProjectIndex(expandedPreviewIndex);
    const nextProject = carouselProjects[nextIndex];

    if (!nextProject || nextProject.isProposition) {
      return;
    }

    clearHoverTimeout();
    remainingMsRef.current = getRotationDelay(nextIndex);
    pauseRotation();
    setActiveIndex(nextIndex);
    setExpandedAnchorIndex(nextIndex);
    setExpandedProject({
      projectId: nextProject.id,
      activationMode: expandedProject.activationMode ?? "pointer",
    });

    scheduleExpandedCardCenter(nextIndex);
  }

  function showPreviousExpandedProject() {
    const previousIndex = getPreviousExpandableProjectIndex(expandedPreviewIndex);
    const previousProject = carouselProjects[previousIndex];

    if (!previousProject || previousProject.isProposition) {
      return;
    }

    clearHoverTimeout();
    remainingMsRef.current = getRotationDelay(previousIndex);
    pauseRotation();
    setActiveIndex(previousIndex);
    setExpandedAnchorIndex(previousIndex);
    setExpandedProject({
      projectId: previousProject.id,
      activationMode: expandedProject.activationMode ?? "pointer",
    });
    scheduleExpandedCardCenter(previousIndex);
  }

  function handleCardPointerEnter(project: PortfolioProject, index: number) {
    if (project.isProposition || !isActiveProject(index) || !canHover()) {
      return;
    }

    clearHoverTimeout();
    pauseRotation();
    hoverTimeoutRef.current = window.setTimeout(() => {
      expandProject(project.id, "pointer", index);
    }, HOVER_INTENT_MS);
  }

  function handleCardPointerLeave(index: number) {
    clearHoverTimeout();

    if (expandedAnchorIndex === index && expandedProject.activationMode === "pointer") {
      collapseProject();
      resumeRotation();
      return;
    }

    if (!expandedProjectId) {
      resumeRotation();
    }
  }

  function handleCardFocus(event: FocusEvent<HTMLElement>, project: PortfolioProject, index: number) {
    if (project.isProposition || !canHover()) {
      pauseRotation();
      return;
    }

    if (!isActiveProject(index)) {
      return;
    }

    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    expandProject(project.id, "keyboard", index);
  }

  function handleCardBlur(event: FocusEvent<HTMLElement>, project: PortfolioProject, index: number) {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    if (expandedAnchorIndex === index && expandedProject.activationMode === "keyboard") {
      collapseProject();
      resumeRotation();
      return;
    }

    if (!expandedProjectId) {
      resumeRotation();
    }
  }

  function handlePointerDown(event: PointerEvent) {
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  function shouldTreatAsTap(event: PointerEvent) {
    const start = pointerStartRef.current;

    if (!start) {
      return true;
    }

    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    pointerStartRef.current = null;

    return distance < 10;
  }

  function handlePreviewClick(event: MouseEvent<HTMLAnchorElement>, project: PortfolioProject, index: number) {
    if (!isCarouselLocked && !isActiveProject(index) && isOnDeckProject(index)) {
      event.preventDefault();
      clearHoverTimeout();
      activateCarouselIndex(index);
      return;
    }

    if (project.isProposition || canHover()) {
      return;
    }

    if (!isActiveProject(index)) {
      return;
    }

    if (expandedProjectId !== project.id) {
      event.preventDefault();
      openMobileProject(project.id, index);
    }
  }

  function renderProjectStatement(project: PortfolioProject) {
    return (project.statement ?? project.eyebrow).split("\n").map((line) => (
      <span key={line}>{line}</span>
    ));
  }

  function renderMedia(project: PortfolioProject) {
    return (project.media ?? []).map((item) => {
      if (item.kind === "video") {
        return (
          <video
            className={`expanded-media-item ${item.className ?? ""}`}
            key={item.id}
            muted
            playsInline
            poster={item.poster}
          >
            <source src={item.src} />
          </video>
        );
      }

      return (
        <img
          className={`expanded-media-item ${item.className ?? ""}`}
          key={item.id}
          src={item.src}
          alt={item.alt}
        />
      );
    });
  }

  return (
    <section
      className={`portfolio-stage${isPaused ? " is-paused" : ""}${isCarouselLocked ? " is-expanded" : ""}`}
      id="portfolio-carousel"
      aria-label="Pebblesprings Studio portfolio"
    >
      <div className="portfolio-gallery-heading">
        <h2>Selected work</h2>
      </div>
      <div
        className="portfolio-scroll"
        onScroll={syncActiveToScroll}
        onWheel={(event) => {
          if (isCarouselLocked) {
            event.preventDefault();
          }
        }}
        onTouchMove={(event) => {
          if (isCarouselLocked) {
            event.preventDefault();
          }
        }}
        ref={scrollRef}
      >
        <div className="work-rail" id="work" aria-label="Selected work">
          {carouselProjects.map((project, index) => {
            const isExpandedAnchor = expandedProjectId !== null && expandedAnchorIndex === index;
            const previewProject = isExpandedAnchor && expandedPreviewProject ? expandedPreviewProject : project;
            const previewIndex = isExpandedAnchor && expandedPreviewIndex >= 0 ? expandedPreviewIndex : index;

            return (
            <article
              aria-expanded={project.isProposition ? undefined : isExpandedAnchor}
              aria-controls={project.isProposition ? undefined : `expanded-preview-${index}`}
              className={[
                "work-card",
                project.isProposition ? "work-card-proposition" : "work-card-project",
                isActiveProject(index) ? "is-active-project" : "",
                isNextProject(index) && !isCarouselLocked ? "is-next-project" : "",
                isExpandedAnchor ? "is-expanded" : "",
                expandedProjectId && !isExpandedAnchor ? "is-hidden-while-expanded" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-project-id={project.id}
              key={project.id}
              onBlur={(event) => handleCardBlur(event, project, index)}
              onFocus={(event) => handleCardFocus(event, project, index)}
              onPointerDown={handlePointerDown}
              onPointerEnter={() => handleCardPointerEnter(project, index)}
              onPointerLeave={() => handleCardPointerLeave(index)}
              onPointerUp={(event) => {
                if (!shouldTreatAsTap(event)) {
                  clearHoverTimeout();
                }
              }}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
            >
              <a
                aria-expanded={project.isProposition ? undefined : isExpandedAnchor}
                aria-label={`Open ${project.title} website in a new tab`}
                className="site-preview"
                href={project.url}
                onClick={(event) => handlePreviewClick(event, project, index)}
                rel="noopener noreferrer"
                target="_blank"
              >
                <img
                  className="portfolio-screenshot"
                  src={project.image}
                  alt={`${project.title} website screenshot`}
                />
                <div className="portfolio-overlay" aria-hidden="true">
                  <img
                    className="portfolio-logo"
                    src={project.logo}
                    alt=""
                  />
                  <span>{project.title}</span>
                </div>
              </a>
              <div className="mobile-project-caption" aria-hidden="true">
                <span>{project.eyebrow}</span>
                <strong>{project.title}</strong>
              </div>
              {!project.isProposition ? (
                <>
                  <a
                    aria-label={`Open ${previewProject.title} project website in a new tab`}
                    className={[
                      "expanded-project-preview",
                      `expanded-layout-${previewProject.expandedLayout ?? "stacked-showcase"}`,
                    ].join(" ")}
                    href={previewProject.url}
                    id={`expanded-preview-${index}`}
                    onClick={(event) => {
                      if (!canHover() && expandedProjectId !== previewProject.id) {
                        event.preventDefault();
                        expandProject(previewProject.id, "touch", index);
                      }
                    }}
                    rel="noopener noreferrer"
                    style={{
                      "--expanded-background": previewProject.expandedBackground ?? "#000000",
                      "--statement-color": previewProject.statementColor ?? "#ffffff",
                    } as CSSProperties}
                    target="_blank"
                  >
                    <span className="expanded-copy" key={`${previewProject.id}-copy`}>
                      <span className="expanded-title">{previewProject.title}</span>
                      <span className="expanded-statement">
                        {renderProjectStatement(previewProject)}
                      </span>
                    </span>

                    <span
                      className="expanded-media"
                      aria-label={`${previewProject.title} project preview`}
                      key={`${previewProject.id}-media`}
                    >
                      {renderMedia(previewProject)}
                    </span>

                    <span className="expanded-scope" key={`${previewProject.id}-scope`}>
                      <span>Scope:</span>
                      {(previewProject.scope ?? []).map((item) => (
                        <strong key={item}>{item}</strong>
                      ))}
                    </span>

                  </a>
                  <button
                    aria-label={`Preview previous project: ${
                      carouselProjects[getPreviousExpandableProjectIndex(previewIndex)]?.title ?? "previous project"
                    }`}
                    className="expanded-back"
                    onClick={(event) => {
                      event.stopPropagation();
                      showPreviousExpandedProject();
                    }}
                    type="button"
                  >
                    <span>←</span>
                  </button>
                  <button
                    aria-label={`Preview next project: ${
                      carouselProjects[getNextExpandableProjectIndex(previewIndex)]?.title ?? "next project"
                    }`}
                    className="expanded-next"
                    onClick={(event) => {
                      event.stopPropagation();
                      showNextExpandedProject();
                    }}
                    type="button"
                  >
                    <span>→</span>
                  </button>
                </>
              ) : null}
            </article>
            );
          })}
        </div>
      </div>

      {isMobileSheetOpen ? (
        <div
          aria-labelledby="mobile-project-sheet-title"
          aria-modal="true"
          className="mobile-project-sheet"
          data-mobile-theme={expandedPreviewProject.expandedBackground === "#000000" ? "dark" : "light"}
          role="dialog"
          style={{
            "--expanded-background": expandedPreviewProject.expandedBackground ?? "#000000",
            "--statement-color": expandedPreviewProject.statementColor ?? "#ffffff",
          } as CSSProperties}
        >
          <div className="mobile-project-sheet-scroll">
            <div className="mobile-project-sheet-controls">
              <button
                aria-label={`Close ${expandedPreviewProject.title} project preview`}
                className="mobile-project-close"
                onClick={collapseProject}
                type="button"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="mobile-project-sheet-heading">
              <h2 id="mobile-project-sheet-title">{expandedPreviewProject.title}</h2>
              <p>{renderProjectStatement(expandedPreviewProject)}</p>
            </div>

            <img
              className="mobile-project-hero"
              src={expandedPreviewProject.media?.[0]?.src ?? expandedPreviewProject.image}
              alt={expandedPreviewProject.media?.[0]?.alt ?? `${expandedPreviewProject.title} website screenshot`}
            />

            <div className="mobile-project-meta">
              <div className="mobile-project-scope">
                <span>Scope</span>
                {(expandedPreviewProject.scope ?? []).map((item) => (
                  <strong key={item}>{item}</strong>
                ))}
              </div>
              <div className="mobile-project-actions">
                <button onClick={showNextExpandedProject} type="button">
                  Next
                </button>
                <a href={expandedPreviewProject.url} rel="noopener noreferrer" target="_blank">
                  Visit Site
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rail-indicator" aria-label="Portfolio piece">
        {carouselProjects.map((project, index) => (
          <button
            aria-label={`Show ${project.title}`}
            aria-current={activeIndex === index}
            className={[
              index < activeIndex ? "is-complete" : "",
              activeIndex === index ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={project.title}
            disabled={isCarouselLocked}
            onClick={() => {
              if (isCarouselLocked) {
                return;
              }

              activateCarouselIndex(index);
            }}
            type="button"
          />
        ))}
      </div>
    </section>
  );
}

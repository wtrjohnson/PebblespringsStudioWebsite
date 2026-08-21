"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  FocusEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent,
} from "react";
import type { PortfolioProject } from "./portfolioData.ts";
import { carouselProjects as allPortfolioProjects } from "./portfolioData.ts";
import { animateScroll } from "./scrollMotion.ts";

const ROTATION_MS = 5200;
const INTRO_ROTATION_MS = 8200;
type OverlayState = {
  projectId: string | null;
  activationMode: "pointer" | "keyboard" | "mobile" | null;
};

const carouselProjects = allPortfolioProjects.filter((project) => !project.isProposition);

export function PortfolioCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedProject, setExpandedProject] = useState<OverlayState>({
    projectId: null,
    activationMode: null,
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const autoScrollCancelRef = useRef<(() => void) | null>(null);
  const wheelUnlockTimeoutRef = useRef<number | null>(null);
  const wheelGestureLockedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClickRef = useRef(false);
  const isPausedRef = useRef(false);
  const remainingMsRef = useRef(ROTATION_MS);
  const rotationStartedAtRef = useRef(0);
  const rotationTimeoutRef = useRef<number | null>(null);

  const expandedProjectId = expandedProject.projectId;
  const expandedPreviewIndex = expandedProjectId
    ? carouselProjects.findIndex((project) => project.id === expandedProjectId)
    : -1;
  const expandedPreviewProject = expandedPreviewIndex >= 0 ? carouselProjects[expandedPreviewIndex] : null;
  const isOverlayActive = expandedProjectId !== null;

  function collapseProject() {
    setExpandedProject({ projectId: null, activationMode: null });
  }

  function getRotationDelay(index: number) {
    return carouselProjects[index]?.isProposition ? INTRO_ROTATION_MS : ROTATION_MS;
  }

  function getCenteredScrollLeft(scrollContainer: HTMLDivElement, card: HTMLElement) {
    const centeredScrollLeft = card.offsetLeft - (scrollContainer.clientWidth - card.offsetWidth) / 2;

    return Math.min(
      Math.max(0, centeredScrollLeft),
      Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth),
    );
  }

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    const card = cardRefs.current[activeIndex];

    if (!scrollContainer || !card || isOverlayActive) {
      return;
    }

    autoScrollCancelRef.current?.();
    autoScrollCancelRef.current = animateScroll({
      target: scrollContainer,
      axis: "left",
      to: getCenteredScrollLeft(scrollContainer, card),
      duration: 520,
    });

    return () => {
      autoScrollCancelRef.current?.();
      autoScrollCancelRef.current = null;
    };
  }, [activeIndex, isOverlayActive]);

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
      if (activeIndex >= carouselProjects.length - 1) {
        isPausedRef.current = true;
        setIsPaused(true);
        rotationTimeoutRef.current = null;
        return;
      }

      setActiveIndex(activeIndex + 1);
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
    if (!isPausedRef.current) {
      return;
    }

    isPausedRef.current = false;
    setIsPaused(false);
    scheduleRotation();
  }

  useEffect(() => {
    if (isPausedRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
    }

    remainingMsRef.current = getRotationDelay(activeIndex);
    scheduleRotation(remainingMsRef.current);

    return clearRotationTimeout;
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (wheelUnlockTimeoutRef.current !== null) {
        window.clearTimeout(wheelUnlockTimeoutRef.current);
      }

      autoScrollCancelRef.current?.();

      clearRotationTimeout();
    };
  }, []);

  useEffect(() => {
    if (!expandedProjectId) {
      return;
    }

    function getExpandedAnchorCard() {
      return expandedPreviewIndex < 0 ? null : cardRefs.current[expandedPreviewIndex];
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

      const indicatorRect = document.querySelector(".rail-indicator")?.getBoundingClientRect();
      const isInsideIndicatorSafeZone = indicatorRect
        ? event.clientX >= indicatorRect.left - 16 &&
          event.clientX <= indicatorRect.right + 16 &&
          event.clientY >= indicatorRect.top - 18 &&
          event.clientY <= indicatorRect.bottom + 18
        : false;

      if (
        !activeCard.contains(target) &&
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
  }, [expandedPreviewIndex, expandedProject.activationMode, expandedProjectId]);

  function clearWheelGestureLock() {
    if (wheelUnlockTimeoutRef.current !== null) {
      window.clearTimeout(wheelUnlockTimeoutRef.current);
    }

    wheelUnlockTimeoutRef.current = window.setTimeout(() => {
      wheelGestureLockedRef.current = false;
      wheelUnlockTimeoutRef.current = null;
    }, 260);
  }

  function moveBy(direction: -1 | 1) {
    if (isOverlayActive) {
      return;
    }

    pauseRotation();
    setActiveIndex((current) => Math.min(
      Math.max(current + direction, 0),
      carouselProjects.length - 1,
    ));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (isOverlayActive) {
      return;
    }

    const delta = event.shiftKey
      ? event.deltaY
      : Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : 0;

    if (Math.abs(delta) < 2) {
      return;
    }

    event.preventDefault();
    clearWheelGestureLock();

    if (wheelGestureLockedRef.current) {
      return;
    }

    wheelGestureLockedRef.current = true;
    moveBy(delta > 0 ? 1 : -1);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") {
      return;
    }

    touchStartRef.current = { x: event.clientX, y: event.clientY };
    suppressNextClickRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const touchStart = touchStartRef.current;
    touchStartRef.current = null;

    if (!touchStart || event.pointerType !== "touch") {
      return;
    }

    const deltaX = event.clientX - touchStart.x;
    const deltaY = event.clientY - touchStart.y;

    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    event.preventDefault();
    suppressNextClickRef.current = true;
    moveBy(deltaX < 0 ? 1 : -1);
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      touchStartRef.current = null;
    }
  }

  function expandProject(projectId: string, activationMode: OverlayState["activationMode"]) {
    pauseRotation();
    setExpandedProject({ projectId, activationMode });
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


  function handleCardPointerEnter(project: PortfolioProject, index: number) {
    if (project.isProposition || !isActiveProject(index) || !canHover()) {
      return;
    }

    pauseRotation();
    expandProject(project.id, "pointer");
  }

  function handleCardPointerLeave(project: PortfolioProject) {
    if (expandedProjectId === project.id && expandedProject.activationMode === "pointer") {
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

    expandProject(project.id, "keyboard");
  }

  function handleCardBlur(event: FocusEvent<HTMLElement>, project: PortfolioProject, index: number) {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    if (expandedProjectId === project.id && expandedProject.activationMode === "keyboard") {
      collapseProject();
      resumeRotation();
      return;
    }

    if (!expandedProjectId) {
      resumeRotation();
    }
  }

  function handlePreviewClick(event: MouseEvent<HTMLAnchorElement>, project: PortfolioProject, index: number) {
    if (suppressNextClickRef.current) {
      event.preventDefault();
      suppressNextClickRef.current = false;
      return;
    }

    if (!isActiveProject(index) && isOnDeckProject(index)) {
      event.preventDefault();
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
      expandProject(project.id, "mobile");
    }
  }

  function renderProjectStatement(project: PortfolioProject) {
    return (project.statement ?? project.eyebrow).split("\n").map((line) => (
      <span key={line}>{line}</span>
    ));
  }


  return (
    <section
      className={`portfolio-stage${isPaused ? " is-paused" : ""}${expandedProjectId ? " is-expanded" : ""}${isOverlayActive ? " is-overlay-active" : ""}`}
      id="portfolio-carousel"
      aria-label="Pebblesprings Studio portfolio"
    >
      <div className="portfolio-gallery-heading">
        <h2>Portfolio</h2>
      </div>
      <div
        className="portfolio-scroll"
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        ref={scrollRef}
      >
        <div className="work-rail" id="work" aria-label="Portfolio">
          {carouselProjects.map((project, index) => {
            const isExpandedAnchor = expandedPreviewIndex === index;
            const previewProject = isExpandedAnchor && expandedPreviewProject ? expandedPreviewProject : project;

            return (
            <article
              aria-expanded={project.isProposition ? undefined : isExpandedAnchor}
              aria-controls={project.isProposition ? undefined : `expanded-preview-${index}`}
              className={[
                "work-card",
                project.isProposition ? "work-card-proposition" : "work-card-project",
                isActiveProject(index) ? "is-active-project" : "",
                isNextProject(index) ? "is-next-project" : "",
                isExpandedAnchor ? "is-expanded" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-project-id={project.id}
              key={project.id}
              onBlur={(event) => handleCardBlur(event, project, index)}
              onFocus={(event) => handleCardFocus(event, project, index)}
              onPointerEnter={() => handleCardPointerEnter(project, index)}
              onPointerLeave={() => handleCardPointerLeave(project)}
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
                      "expanded-layout-case-study",
                    ].join(" ")}
                    href={previewProject.url}
                    id={`expanded-preview-${index}`}
                    onClick={(event) => {
                      if (!canHover() && expandedProjectId !== previewProject.id) {
                        event.preventDefault();
                        expandProject(previewProject.id, "mobile");
                      }
                    }}
                    rel="noopener noreferrer"
                    style={{
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

                    <span className="expanded-scope" key={`${previewProject.id}-scope`}>
                      <span>Scope:</span>
                      {(previewProject.scope ?? []).map((item) => (
                        <strong key={item}>{item}</strong>
                      ))}
                    </span>

                  </a>
                </>
              ) : null}
            </article>
            );
          })}
        </div>
      </div>

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
            onClick={() => {
              if (expandedProjectId) {
                collapseProject();
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

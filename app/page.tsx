"use client";

import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PortfolioCarousel } from "./PortfolioCarousel.tsx";

type LowerScene = "about" | "performance" | "contact";
type Scene = "landing" | LowerScene;
type ScoreKey = "speed" | "reach" | "reliability" | "visibility";

type ScoreMetric = {
  key: ScoreKey;
  label: string;
  value: number;
};

type ScoreResult = {
  url: string;
  scores: Record<ScoreKey, number>;
};

const lowerNavItems: Array<{ label: string; scene: LowerScene }> = [
  { label: "About", scene: "about" },
  { label: "Performance", scene: "performance" },
  { label: "Contact", scene: "contact" },
];

const studioScores: ScoreMetric[] = [
  { key: "speed", label: "Speed", value: 100 },
  { key: "reach", label: "Reach", value: 94 },
  { key: "reliability", label: "Reliability", value: 97 },
  { key: "visibility", label: "Visibility", value: 98 },
];

const scoreLabels: Record<ScoreKey, string> = {
  speed: "Speed",
  reach: "Reach",
  reliability: "Reliability",
  visibility: "Visibility",
};

const scoreOrder: ScoreKey[] = ["speed", "reach", "reliability", "visibility"];

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function displayUrl(value: string) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

function getScoreColor(score: number) {
  if (score >= 90) {
    return "#0CCE6B";
  }

  if (score >= 50) {
    return "#FFA400";
  }

  return "#FF4E42";
}

function getVerdict(lowestScore: number) {
  if (lowestScore >= 90) {
    return "You're already in the range we build to.";
  }

  if (lowestScore >= 50) {
    return "Solid, but not where it should be.";
  }

  return "These scores are likely costing you visitors.";
}

function ScoreRing({
  label,
  score,
  delay = 0,
  inverted = false,
}: {
  label: string;
  score: number;
  delay?: number;
  inverted?: boolean;
}) {
  const [visibleScore, setVisibleScore] = useState(0);
  const radius = 46;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const arcRatio = 0.86;
  const arcLength = circumference * arcRatio;
  const gapLength = circumference - arcLength;
  const clampedScore = Math.max(0, Math.min(score, 100));
  const visiblePercent = visibleScore / 100;
  const color = visibleScore <= 0 ? (inverted ? "#3a3a3a" : "#d8d8d2") : getScoreColor(visibleScore);

  useEffect(() => {
    let frameId = 0;
    let startTime = 0;
    const duration = 1320;
    const timeoutId = window.setTimeout(() => {
      const tick = (timestamp: number) => {
        if (!startTime) {
          startTime = timestamp;
        }

        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setVisibleScore(Math.round(clampedScore * eased));

        if (progress < 1) {
          frameId = window.requestAnimationFrame(tick);
        }
      };

      frameId = window.requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frameId);
    };
  }, [clampedScore, delay]);

  return (
    <div
      className={`score-ring${inverted ? " score-ring-inverted" : ""}`}
      style={{ "--ring-color": color, "--ring-delay": `${delay}ms` } as CSSProperties}
    >
      <svg className="score-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
        <circle
          className="score-ring-track"
          cx="60"
          cy="60"
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${gapLength}`}
          strokeDashoffset={circumference * 0.07}
          pathLength={circumference}
        />
        <circle
          className="score-ring-fill"
          cx="60"
          cy="60"
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength * visiblePercent} ${circumference}`}
          strokeDashoffset={circumference * 0.07}
          pathLength={circumference}
        />
      </svg>
      <strong style={{ color }}>{visibleScore}</strong>
      <span>{label}</span>
    </div>
  );
}

function PerformanceSection({
  onStartFix,
}: {
  onStartFix: (message: string) => void;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const resultMetrics = useMemo(
    () =>
      result
        ? scoreOrder.map((key) => ({
            key,
            label: scoreLabels[key],
            value: result.scores[key],
          }))
        : [],
    [result],
  );
  const lowestScore = resultMetrics.length
    ? Math.min(...resultMetrics.map((metric) => metric.value))
    : 0;
  const verdict = result ? getVerdict(lowestScore) : "";

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = normalizeUrl(urlInput);

    if (!url) {
      setErrorMessage("Enter a URL to check.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/lighthouse-score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as ScoreResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to score that site right now.");
      }

      setResult(data);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to score that site right now.");
    }
  }, [urlInput]);

  const resetChecker = useCallback(() => {
    setResult(null);
    setStatus("idle");
    setErrorMessage("");
    setUrlInput("");
  }, []);

  return (
    <div className="performance-layout">
      <section className="performance-scorecard" aria-label="Studio Lighthouse scorecard">
        <div className="performance-heading">
          <div>
            <h1>Built to hold up under scrutiny.</h1>
            <p>We guarantee high performing websites. Here&apos;s how we measure up to our promise. Updated daily.</p>
          </div>
          <p>Average score of our live projects.</p>
        </div>

        <div className="score-grid">
          {studioScores.map((metric, index) => (
            <ScoreRing
              key={metric.key}
              label={metric.label}
              score={metric.value}
              delay={index * 120}
            />
          ))}
        </div>
      </section>

      <section
        className={`website-checker${result ? " has-results" : ""}`}
        aria-label="Website performance checker"
      >
        <div className="checker-stage">
          <div className="checker-default" aria-hidden={result ? "true" : undefined}>
            <div className="checker-default-copy">
              <h2>Let&apos;s test your website.</h2>
              <p>Drop your URL below and we&apos;ll score it the same way we score ours.</p>
            </div>
            <form className="checker-form" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="website-url">
                Website URL
              </label>
              <input
                id="website-url"
                type="text"
                inputMode="url"
                placeholder="yourwebsite.com"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                disabled={status === "loading"}
              />
              <button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Checking Site" : "Check my Site"}
              </button>
            </form>
            {status === "error" && <p className="checker-error">{errorMessage}</p>}
          </div>

          <div className="checker-results" aria-live="polite">
            <h2>Let&apos;s test your website.</h2>
            {result && (
              <>
                <p className="results-label">Scores for {displayUrl(result.url)}</p>
                <div className="result-score-grid">
                  {resultMetrics.map((metric, index) => (
                    <ScoreRing
                      key={`${result.url}-${metric.key}`}
                      label={metric.label}
                      score={metric.value}
                      delay={220 + index * 150}
                      inverted
                    />
                  ))}
                </div>
                <div className="checker-verdict">
                  <p>{verdict}</p>
                  <div className="checker-actions">
                    <button
                      className="checker-primary"
                      type="button"
                      onClick={() =>
                        onStartFix(
                          `I just checked ${displayUrl(result.url)} and scored ${lowestScore} - let's talk.`,
                        )
                      }
                    >
                      Let&apos;s Fix It
                    </button>
                    <button className="checker-secondary" type="button" onClick={resetChecker}>
                      Check Another Site
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const brandRevealColumns = 10;
const brandRevealRows = 4;
const blankBrandRevealTiles = new Set(["0-0", "0-3", "1-3", "8-3", "9-0", "9-3"]);
const brandRevealTiles = Array.from({ length: brandRevealColumns * brandRevealRows }, (_, tileIndex) => {
  const column = tileIndex % brandRevealColumns;
  const row = Math.floor(tileIndex / brandRevealColumns);
  const clusterDelay = column * 72 + row * 18;
  const irregularDelay = [44, 0, 92, 28, 126, 62, 164, 100, 204, 142][column] + [0, 38, 14, 56][row];

  return {
    column,
    row,
    delay: 2000 + clusterDelay + irregularDelay,
    isBlank: blankBrandRevealTiles.has(`${column}-${row}`),
  };
});

export default function Home() {
  const [lowerScene, setLowerScene] = useState<LowerScene>("about");
  const [isContactSubmitted, setIsContactSubmitted] = useState(false);
  const [isContactSubmitSettled, setIsContactSubmitSettled] = useState(false);
  const [contactMessageDraft, setContactMessageDraft] = useState("");
  const landingSceneRef = useRef<HTMLElement | null>(null);
  const lowerSceneRef = useRef<HTMLElement | null>(null);
  const contactFormRef = useRef<HTMLFormElement | null>(null);
  const contactSubmitButtonRef = useRef<HTMLButtonElement | null>(null);

  const moveToScene = useCallback((scene: Scene) => {
    if (scene === "landing") {
      landingSceneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setLowerScene(scene);
    if (scene === "contact") {
      setIsContactSubmitted(false);
      setIsContactSubmitSettled(false);
    }
    window.requestAnimationFrame(() => {
      lowerSceneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const startFixConversation = useCallback((message: string) => {
    setContactMessageDraft(message);
    moveToScene("contact");
  }, [moveToScene]);

  const handleContactSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formRect = contactFormRef.current?.getBoundingClientRect();
    const buttonRect = contactSubmitButtonRef.current?.getBoundingClientRect();

    if (formRect && buttonRect) {
      contactFormRef.current?.style.setProperty(
        "--send-button-rise",
        `${Math.max(buttonRect.top - formRect.top, 0)}px`,
      );
    }

    setIsContactSubmitted(true);
    setIsContactSubmitSettled(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsContactSubmitSettled(true);
      });
    });
  }, []);

  return (
    <main className="scene-viewport">
      <div className="scene-stack">
        <section
          className="studio-shell scene-panel"
          aria-label="Pebblesprings Studio home"
          ref={landingSceneRef}
        >
          <div className="studio-main">
            <aside className="studio-sidebar" aria-label="Pebblesprings Studio">
              <a
                className="brand"
                href="#top"
                aria-label="Pebblesprings Studio home"
                onClick={(event) => {
                  event.preventDefault();
                  moveToScene("landing");
                }}
              >
                <span className="brand-mark" aria-hidden="true">
                  <img
                    className="brand-mark-image brand-mark-default"
                    src="/PSLogo.png"
                    alt=""
                    width="98"
                    height="98"
                  />
                  <span className="brand-mark-hover" aria-hidden="true">
                    <img
                      className="brand-mark-image brand-mark-hover-image"
                      src="/Logo%20Hover.png"
                      alt=""
                      width="98"
                      height="98"
                    />
                    <span className="brand-reveal-grid" aria-hidden="true">
                      {brandRevealTiles.map((tile) => (
                        <span
                          className={`brand-reveal-tile${tile.isBlank ? " is-blank" : ""}`}
                          key={`${tile.column}-${tile.row}`}
                          style={{
                            "--tile-column": tile.column,
                            "--tile-row": tile.row,
                            "--tile-delay": `${tile.delay}ms`,
                          } as CSSProperties}
                        />
                      ))}
                    </span>
                  </span>
                </span>
                <span className="brand-name">
                  Pebblesprings
                  <br />
                  Studio
                </span>
              </a>

              <nav className="site-nav" aria-label="Primary navigation">
                <button type="button" onClick={() => moveToScene("about")}>
                  About
                </button>
                <button type="button" onClick={() => moveToScene("performance")}>
                  Performance
                </button>
                <button type="button" onClick={() => moveToScene("landing")}>
                  Work
                </button>
                <button type="button" onClick={() => moveToScene("contact")}>
                  Contact
                </button>
              </nav>

              <button
                className="project-cta"
                onClick={() => moveToScene("contact")}
                type="button"
              >
                <span className="cta-icon" aria-hidden="true">
                  <img className="door-closed" src="/1.png" alt="" />
                  <img className="door-open" src="/2.png" alt="" />
                </span>
                <span className="cta-label">Start a project</span>
              </button>
            </aside>

            <PortfolioCarousel />
          </div>

          <footer className="site-footer" id="contact" aria-label="Footer">
            <span className="footer-items">
              <a href="mailto:will@pebblesprings.co">will@pebblesprings.co</a>
              <span>© 2026 Pebblesprings Studio</span>
            </span>
          </footer>
        </section>

        <section
          className="lower-scene scene-panel"
          aria-label={lowerScene === "contact" ? "Contact Pebblesprings Studio" : "About Pebblesprings Studio"}
          ref={lowerSceneRef}
        >
          <div className="lower-topbar">
            <button
              className="scene-back"
              onClick={() => moveToScene("landing")}
              type="button"
            >
              ↑ Back
            </button>

            <nav className="lower-nav" aria-label="Lower page navigation">
              {lowerNavItems.map((item) => (
                <button
                  aria-current={lowerScene === item.scene ? "page" : undefined}
                  key={item.scene}
                  onClick={() => moveToScene(item.scene)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="lower-content" key={lowerScene}>
            {lowerScene === "contact" ? (
              <div className="contact-layout">
                <div className="contact-copy">
                  <h1>Start a project</h1>
                  <p>
                    Tell me what you’re building.
                    <br />
                    I’ll reply as soon as I can.
                  </p>
                </div>

                <form
                  aria-live="polite"
                  className={[
                    "contact-form",
                    isContactSubmitted ? "is-sent" : "",
                    isContactSubmitSettled ? "is-settled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onSubmit={handleContactSubmit}
                  ref={contactFormRef}
                >
                  <label>
                    <span>Name</span>
                    <input name="name" type="text" autoComplete="name" />
                  </label>
                  <label>
                    <span>Email</span>
                    <input name="email" type="email" autoComplete="email" />
                  </label>
                  <label>
                    <span>Project / company</span>
                    <input name="project" type="text" />
                  </label>
                  <label className="contact-message">
                    <span>What do you need?</span>
                    <textarea name="message" rows={5} defaultValue={contactMessageDraft} />
                  </label>
                  <label>
                    <span>Budget range</span>
                    <input name="budget" type="text" />
                  </label>
                  <label>
                    <span>Timeline</span>
                    <input name="timeline" type="text" />
                  </label>
                  <button disabled={isContactSubmitted} ref={contactSubmitButtonRef} type="submit">
                    <span className="send-label send-label-default">Send message</span>
                    <span className="send-label send-label-sent">Message Sent</span>
                  </button>
                </form>

                <a className="contact-email" href="mailto:will@pebblesprings.co">
                  will@pebblesprings.co
                </a>
              </div>
            ) : lowerScene === "performance" ? (
              <PerformanceSection onStartFix={startFixConversation} />
            ) : (
              <div className="about-layout">
                <section className="about-intro" aria-label="About Pebblesprings Studio">
                  <h1>
                    Quiet websites
                    <br />
                    for serious work.
                  </h1>
                  <p>
                    Pebblesprings Studio designs and builds considered web presences for small firms, independent practices, and people with something specific to say.
                  </p>
                </section>

                <section className="about-note" aria-label="Studio note">
                  <p>
                    The work is restrained on purpose: clear structure, careful typography, useful motion, and enough space for the subject to breathe.
                  </p>
                </section>

                <dl className="about-details" aria-label="Studio details">
                  <div>
                    <dt>Focus</dt>
                    <dd>Identity systems, websites, and digital editorial spaces.</dd>
                  </div>
                  <div>
                    <dt>Scale</dt>
                    <dd>Small teams, founder-led companies, and independent practices.</dd>
                  </div>
                  <div>
                    <dt>Approach</dt>
                    <dd>Design and front-end build shaped together.</dd>
                  </div>
                </dl>

                <section className="about-origin" aria-label="Behind the Pebblesprings name">
                  <div className="origin-copy">
                    <h2>
                      The name comes from
                      <br />
                      a tree farm.
                    </h2>
                    <p>
                      Pebblesprings is named after the place my grandparents built over time: part working forest, part family gathering place, made with care and meant to be returned to.
                    </p>
                  </div>

                  <div className="origin-images" aria-label="Pebblesprings Tree Farm photos">
                    <img
                      className="origin-image origin-image-forest"
                      src="/pebblesprings-forest.png"
                      alt="A path through the forest at Pebblesprings Tree Farm"
                    />
                    <img
                      className="origin-image origin-image-sign"
                      src="/pebblesprings-sign.jpeg"
                      alt="Pebblesprings Tree Farm sign on a wooden wall"
                    />
                  </div>
                </section>

                <section className="about-close" aria-label="Start a project">
                  <h2>
                    Make something
                    <br />
                    and alive.
                  </h2>
                  <button type="button" onClick={() => moveToScene("contact")}>
                    Start a project →
                  </button>
                </section>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

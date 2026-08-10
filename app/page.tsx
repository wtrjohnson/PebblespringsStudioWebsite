"use client";

import {
  type CSSProperties,
  type FormEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MobileNavMenu, type MobileNavItem } from "./MobileNavMenu.tsx";
import { PortfolioCarousel } from "./PortfolioCarousel.tsx";
import { animateScroll } from "./scrollMotion.ts";
import { usePortfolioScores } from "./usePortfolioScores.ts";

type Scene = "landing" | "portfolio" | "about" | "performance";
type ScoreKey = "speed" | "reach" | "reliability" | "visibility";

type ScoreMetric = {
  key: ScoreKey;
  label: string;
  value: number;
};

type ScoreResult = {
  url: string;
  scores: Record<ScoreKey, number>;
  websiteTestId?: number;
};

const FALLBACK_SCORES: ScoreMetric[] = [
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

const scoreDescriptions: Record<ScoreKey, string> = {
  speed: "How fast your site loads and responds. The first thing anyone notices, whether they realize it or not.",
  reach: "How usable your site is for more people, across devices, inputs, and accessibility needs.",
  reliability: "How solid the build is under the hood, from browser behavior to technical best practices.",
  visibility: "How clearly search engines can understand, index, and share your site.",
};

const transitionEndings = [
  "load fast and stay fast.",
  "you can actually update yourself.",
  "look like nobody else's.",
];

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    const isLocalhost = hostname === "localhost";
    const isIpAddress = /^[\d.]+$/.test(hostname) || hostname.includes(":");
    const shouldUseWww = !hostname.startsWith("www.")
      && hostname.split(".").length === 2
      && !isLocalhost
      && !isIpAddress;

    url.protocol = url.protocol.toLowerCase();
    url.hostname = shouldUseWww ? `www.${hostname}` : hostname;
    url.hash = "";

    return url.toString();
  } catch {
    return candidate;
  }
}

function displayUrl(value: string) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

const DESCRIPTION_OVERLAP = 18;

function descriptionPositionStyle(grid: HTMLElement | null, target: HTMLElement): CSSProperties {
  if (!grid) {
    return {};
  }

  const gridRect = grid.getBoundingClientRect();
  const ringEl = target.querySelector(".score-ring") ?? target;
  const ringRect = ringEl.getBoundingClientRect();
  const centerY = ringRect.top - gridRect.top + ringRect.height / 2;
  const ringCenterX = ringRect.left - gridRect.left + ringRect.width / 2;
  const isRightHalf = ringCenterX > gridRect.width / 2;

  const style: Record<string, string> = {
    "--desc-y": `${centerY}px`,
  };

  if (isRightHalf) {
    style["--desc-right"] = `${Math.max(0, gridRect.width - (ringRect.left - gridRect.left) - DESCRIPTION_OVERLAP)}px`;
  } else {
    style["--desc-left"] = `${Math.max(0, ringRect.right - gridRect.left - DESCRIPTION_OVERLAP)}px`;
  }

  return style as CSSProperties;
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
    return "Strong foundation. Now it's about keeping it that way.";
  }

  if (lowestScore >= 50) {
    return "Solid, but not where it could be.";
  }

  return "These scores are likely costing you visitors.";
}

function getPrimaryCtaLabel(lowestScore: number) {
  if (lowestScore >= 90) {
    return "Keep It Sharp";
  }

  if (lowestScore >= 50) {
    return "Improve This Site";
  }

  return "Let's Fix It";
}

function TransitionStatement() {
  const transitionRef = useRef<HTMLElement | null>(null);
  const endingRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const [activeEnding, setActiveEnding] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const updateActiveEnding = () => {
      frameId = 0;
      const transition = transitionRef.current;

      if (!transition) {
        return;
      }

      const rect = transition.getBoundingClientRect();
      const sectionTop = window.scrollY + rect.top;
      const travel = Math.max(rect.height - window.innerHeight, 1);
      const progress = Math.min(Math.max((window.scrollY - sectionTop) / travel, 0), 1);
      const nextEnding = Math.min(
        transitionEndings.length - 1,
        Math.floor(progress * transitionEndings.length),
      );
      const activeEndingElement = endingRefs.current[nextEnding];
      const endings = activeEndingElement?.parentElement;
      const measuredLeadOffset = activeEndingElement && endings
        ? activeEndingElement.getBoundingClientRect().top - endings.getBoundingClientRect().top
        : 0;

      setActiveEnding(nextEnding);
      transition.style.setProperty("--lead-offset", `${measuredLeadOffset}px`);
    };

    const requestUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateActiveEnding);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section
      className="transition-statement"
      aria-label="What Pebblesprings Studio websites are built to do"
      ref={transitionRef}
    >
      <div className="transition-copy">
        <p className="transition-lead">We build websites that</p>
        <div className="transition-endings" aria-live="polite">
          {transitionEndings.map((ending, index) => (
            <p
              aria-current={activeEnding === index ? "true" : undefined}
              className={activeEnding === index ? "is-active" : ""}
              key={ending}
              ref={(element) => {
                endingRefs.current[index] = element;
              }}
            >
              {ending}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScoreRing({
  label,
  score,
  animate = true,
  delay = 0,
  inverted = false,
  loading = false,
}: {
  label: string;
  score: number;
  animate?: boolean;
  delay?: number;
  inverted?: boolean;
  loading?: boolean;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 46;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(score, 100));
  const visiblePercent = loading ? 0.26 : animatedScore / 100;
  const color = loading
    ? "#777777"
    : animatedScore <= 0
      ? (inverted ? "#3a3a3a" : "#d8d8d2")
      : getScoreColor(animatedScore);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!animate) {
      return;
    }

    let frameId = 0;
    let startTime = 0;
    const duration = 1760;
    const timeoutId = window.setTimeout(() => {
      const tick = (timestamp: number) => {
        if (!startTime) {
          startTime = timestamp;
        }

        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        setAnimatedScore(clampedScore * eased);

        if (progress < 1) {
          frameId = window.requestAnimationFrame(tick);
        } else {
          setAnimatedScore(clampedScore);
        }
      };

      frameId = window.requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frameId);
    };
  }, [animate, clampedScore, delay, loading]);

  return (
    <div
      className={[
        "score-ring",
        animate ? "is-animated" : "",
        inverted ? "score-ring-inverted" : "",
        loading ? "is-loading" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--ring-color": color,
        "--ring-delay": `${delay}ms`,
        "--score-number-color": inverted ? color : "var(--foreground)",
      } as CSSProperties}
    >
      <svg className="score-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
        <circle
          className="score-ring-track"
          cx="60"
          cy="60"
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset="0"
          pathLength={circumference}
        />
        <circle
          className="score-ring-fill"
          cx="60"
          cy="60"
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference * visiblePercent} ${circumference}`}
          strokeDashoffset="0"
          pathLength={circumference}
        />
      </svg>
      <strong>{loading ? "" : Math.round(animatedScore)}</strong>
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
  const [activeResultKey, setActiveResultKey] = useState<ScoreKey | null>(null);
  const [resultDescStyle, setResultDescStyle] = useState<CSSProperties>({});
  const [activeStudioKey, setActiveStudioKey] = useState<ScoreKey | null>(null);
  const [studioDescStyle, setStudioDescStyle] = useState<CSSProperties>({});
  const resultGridRef = useRef<HTMLDivElement | null>(null);
  const studioGridRef = useRef<HTMLDivElement | null>(null);
  const [areResultDescriptionsEnabled, setAreResultDescriptionsEnabled] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingUrl, setPendingUrl] = useState("");
  const [reportEmail, setReportEmail] = useState("");
  const [reportStatus, setReportStatus] = useState<"closed" | "editing" | "sending" | "sent">("closed");
  const [reportErrorMessage, setReportErrorMessage] = useState("");
  const [shouldAnimateStudioScores, setShouldAnimateStudioScores] = useState(false);
  const studioScores = usePortfolioScores(FALLBACK_SCORES);
  const performanceRef = useRef<HTMLDivElement | null>(null);
  const scorecardRef = useRef<HTMLElement | null>(null);
  const checkerRef = useRef<HTMLElement | null>(null);
  const reportResetTimeoutRef = useRef<number | null>(null);
  const isChecking = status === "loading";
  const shouldShowCheckerResults = Boolean(result) || isChecking;
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
  const primaryCtaLabel = result ? getPrimaryCtaLabel(lowestScore) : "Let's Fix It";

  const scrollToResultView = useCallback((offset: number, duration = 260) => {
    const target = window.innerWidth <= 900 ? checkerRef.current : performanceRef.current;

    if (!target) {
      return undefined;
    }

    const rect = target.getBoundingClientRect();
    const targetY = Math.max(0, window.scrollY + rect.top - offset);

    return animateScroll({ target: window, axis: "top", to: targetY, duration });
  }, []);

  useEffect(() => {
    const scorecard = scorecardRef.current;

    if (!scorecard || shouldAnimateStudioScores) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      const frameId = window.requestAnimationFrame(() => {
        setShouldAnimateStudioScores(true);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    const rect = scorecard.getBoundingClientRect();

    if (rect.top < window.innerHeight * 0.82 && rect.bottom > window.innerHeight * 0.18) {
      const frameId = window.requestAnimationFrame(() => {
        setShouldAnimateStudioScores(true);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    if (rect.bottom <= 0) {
      const frameId = window.requestAnimationFrame(() => {
        setShouldAnimateStudioScores(true);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldAnimateStudioScores(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: "0px 0px -18% 0px",
        threshold: 0.35,
      },
    );

    observer.observe(scorecard);

    return () => observer.disconnect();
  }, [shouldAnimateStudioScores]);

  useEffect(() => {
    if (!result || !checkerRef.current) {
      return;
    }

    setAreResultDescriptionsEnabled(false);
    let cancelScroll: (() => void) | undefined;
    const descriptionDelay = window.setTimeout(() => {
      setAreResultDescriptionsEnabled(true);
    }, 600);
    const scrollFrame = window.requestAnimationFrame(() => {
      cancelScroll = scrollToResultView(54, 820);
    });

    return () => {
      window.clearTimeout(descriptionDelay);
      window.cancelAnimationFrame(scrollFrame);
      cancelScroll?.();
    };
  }, [result, scrollToResultView]);

  useEffect(() => {
    return () => {
      if (reportResetTimeoutRef.current) {
        window.clearTimeout(reportResetTimeoutRef.current);
      }
    };
  }, []);

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
    setResult(null);
    setActiveResultKey(null);
    setAreResultDescriptionsEnabled(false);
    setReportStatus("closed");
    setReportEmail("");
    setReportErrorMessage("");
    setPendingUrl(url);

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
      setActiveResultKey(null);
      setAreResultDescriptionsEnabled(false);
      setReportStatus("closed");
      setReportEmail("");
      setReportErrorMessage("");
      setStatus("idle");
      setPendingUrl("");
    } catch (error) {
      setStatus("error");
      setPendingUrl("");
      setErrorMessage(error instanceof Error ? error.message : "Unable to score that site right now.");
    }
  }, [urlInput]);

  const resetChecker = useCallback(() => {
    setResult(null);
    setActiveResultKey(null);
    setAreResultDescriptionsEnabled(false);
    setStatus("idle");
    setErrorMessage("");
    setUrlInput("");
    setPendingUrl("");
    setReportStatus("closed");
    setReportEmail("");
    setReportErrorMessage("");
  }, []);

  const openReportForm = useCallback(() => {
    setReportStatus("editing");
    setReportErrorMessage("");
  }, []);

  const handleReportSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = reportEmail.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setReportErrorMessage("Enter a valid email.");
      return;
    }

    if (!result?.websiteTestId) {
      setReportErrorMessage("Run the website check again before sending a report.");
      return;
    }

    setReportStatus("sending");
    setReportErrorMessage("");

    try {
      const response = await fetch("/api/website-test-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          websiteTestId: result.websiteTestId,
          email,
          message: `Email report for ${displayUrl(result.url)}.`,
          requestType: "report",
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to send that report right now.");
      }

      setReportStatus("sent");

      if (reportResetTimeoutRef.current) {
        window.clearTimeout(reportResetTimeoutRef.current);
      }

      reportResetTimeoutRef.current = window.setTimeout(() => {
        setReportStatus("closed");
        setReportEmail("");
        setReportErrorMessage("");
        reportResetTimeoutRef.current = null;
      }, 4200);
    } catch (error) {
      setReportStatus("editing");
      setReportErrorMessage(error instanceof Error ? error.message : "Unable to send that report right now.");
    }
  }, [reportEmail, result]);

  return (
    <div
      className={`performance-layout${shouldShowCheckerResults ? " has-checker-results" : ""}`}
      ref={performanceRef}
    >
      <section className="performance-scorecard" aria-label="Studio Lighthouse scorecard" ref={scorecardRef}>
        <div className="performance-heading">
          <h2>High-performing websites, guaranteed.</h2>
          <p>Here&apos;s how our live websites measure up to our promise. Updated daily.</p>
        </div>

        <div
          className={["score-grid", activeStudioKey ? "has-active-description" : ""]
            .filter(Boolean)
            .join(" ")}
          onPointerLeave={() => setActiveStudioKey(null)}
          ref={studioGridRef}
        >
          {studioScores.map((metric, index) => (
            <div
              aria-describedby="studio-score-description"
              aria-label={`${metric.label}: ${scoreDescriptions[metric.key]}`}
              className={[
                "result-score-item",
                activeStudioKey === metric.key ? "is-active" : "",
                activeStudioKey && activeStudioKey !== metric.key ? "is-dimmed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={metric.key}
              onClick={(event) => {
                setActiveStudioKey(metric.key);
                setStudioDescStyle(descriptionPositionStyle(studioGridRef.current, event.currentTarget));
              }}
              onFocus={(event) => {
                setActiveStudioKey(metric.key);
                setStudioDescStyle(descriptionPositionStyle(studioGridRef.current, event.currentTarget));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveStudioKey(metric.key);
                  setStudioDescStyle(descriptionPositionStyle(studioGridRef.current, event.currentTarget));
                }
              }}
              onPointerEnter={(event) => {
                setActiveStudioKey(metric.key);
                setStudioDescStyle(descriptionPositionStyle(studioGridRef.current, event.currentTarget));
              }}
              role="button"
              tabIndex={0}
            >
              <ScoreRing
                label={metric.label}
                score={metric.value}
                animate={shouldAnimateStudioScores}
                delay={index * 120}
              />
            </div>
          ))}
          <p
            className="result-score-description studio-score-description"
            id="studio-score-description"
            style={studioDescStyle}
          >
            {activeStudioKey ? scoreDescriptions[activeStudioKey] : ""}
          </p>
        </div>
      </section>

      <section
        className={[
          "website-checker",
          shouldShowCheckerResults ? "has-results" : "",
          isChecking ? "is-checking" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Website performance checker"
        ref={checkerRef}
      >
        <div className="checker-stage">
          <div className="checker-default" aria-hidden={shouldShowCheckerResults ? "true" : undefined}>
            <div className="checker-default-copy">
              <h2>Want to see how your website compares?</h2>
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
                {status === "loading" ? "Checking Site" : "Check My Site"}
              </button>
            </form>
            {status === "error" && <p className="checker-error">{errorMessage}</p>}
          </div>

          <div className="checker-results" aria-live="polite">
            <div className="checker-results-header">
              <h2>Want to see how your website compares?</h2>
              {isChecking && <p className="results-label">Checking {displayUrl(pendingUrl)}</p>}
              {result && <p className="results-label">Scores for {displayUrl(result.url)}</p>}
            </div>
            {isChecking && (
              <div className="result-score-grid is-loading" aria-label="Checking website scores">
                {scoreOrder.map((key, index) => (
                  <div className="result-score-item" key={`loading-${key}`}>
                    <ScoreRing
                      label={scoreLabels[key]}
                      score={0}
                      delay={180 + index * 110}
                      inverted
                      loading
                    />
                  </div>
                ))}
              </div>
            )}
            {result && (
              <>
                <div
                  className={[
                    "result-score-grid",
                    activeResultKey ? "has-active-description" : "",
                    areResultDescriptionsEnabled ? "is-description-ready" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onPointerLeave={() => setActiveResultKey(null)}
                  ref={resultGridRef}
                >
                  {resultMetrics.map((metric, index) => (
                    <div
                      aria-describedby="score-description"
                      aria-label={`${metric.label}: ${scoreDescriptions[metric.key]}`}
                      className={[
                        "result-score-item",
                        activeResultKey === metric.key ? "is-active" : "",
                        activeResultKey && activeResultKey !== metric.key ? "is-dimmed" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={`${result.url}-${metric.key}`}
                      onClick={(event) => {
                        if (areResultDescriptionsEnabled) {
                          setActiveResultKey(metric.key);
                          setResultDescStyle(descriptionPositionStyle(resultGridRef.current, event.currentTarget));
                        }
                      }}
                      onFocus={(event) => {
                        if (areResultDescriptionsEnabled) {
                          setActiveResultKey(metric.key);
                          setResultDescStyle(descriptionPositionStyle(resultGridRef.current, event.currentTarget));
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          if (areResultDescriptionsEnabled) {
                            setActiveResultKey(metric.key);
                            setResultDescStyle(descriptionPositionStyle(resultGridRef.current, event.currentTarget));
                          }
                        }
                      }}
                      onPointerEnter={(event) => {
                        if (areResultDescriptionsEnabled) {
                          setActiveResultKey(metric.key);
                          setResultDescStyle(descriptionPositionStyle(resultGridRef.current, event.currentTarget));
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <ScoreRing
                        label={metric.label}
                        score={metric.value}
                        delay={220 + index * 150}
                        inverted
                      />
                    </div>
                  ))}
                  <p className="result-score-description" id="score-description" style={resultDescStyle}>
                    {activeResultKey ? scoreDescriptions[activeResultKey] : ""}
                  </p>
                </div>
                <div className="checker-verdict">
                  <p>{verdict}</p>
                  <div className="checker-action-stack">
                    <form
                      className={[
                        "checker-actions",
                        "checker-morph-actions",
                        `is-${reportStatus}`,
                      ].join(" ")}
                      onSubmit={handleReportSubmit}
                    >
                      <div className="checker-morph-primary">
                        {reportStatus === "closed" ? (
                          <button
                            className="checker-primary checker-morph-control"
                            type="button"
                            onClick={() =>
                              onStartFix(
                                `I just checked ${displayUrl(result.url)} and scored ${lowestScore} - let's talk.`,
                              )
                            }
                          >
                            {primaryCtaLabel}
                          </button>
                        ) : reportStatus === "sent" ? (
                          <div className="checker-report-sent checker-morph-control">
                            Sent. Check your inbox in a minute.
                          </div>
                        ) : (
                          <>
                            <label className="sr-only" htmlFor="report-email">
                              Email address
                            </label>
                            <input
                              autoComplete="email"
                              className="checker-morph-control"
                              id="report-email"
                              inputMode="email"
                              onChange={(event) => setReportEmail(event.target.value)}
                              placeholder="you@example.com"
                              type="email"
                              value={reportEmail}
                            />
                          </>
                        )}
                      </div>
                      <div className="checker-morph-secondary">
                        <button
                          className={[
                            reportStatus === "closed" ? "checker-secondary" : "checker-primary",
                            "checker-morph-control",
                            "checker-report-submit",
                            reportStatus === "sent" ? "is-sent" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          disabled={reportStatus === "sent" || reportStatus === "sending"}
                          onClick={reportStatus === "closed" ? resetChecker : undefined}
                          type={reportStatus === "closed" ? "button" : "submit"}
                        >
                          {reportStatus === "closed" ? (
                            "Check Another Site"
                          ) : reportStatus === "sent" ? (
                            <svg
                              aria-hidden="true"
                              className="checker-report-check"
                              viewBox="0 0 24 24"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          ) : reportStatus === "sending" ? (
                            "Sending..."
                          ) : (
                            "Send Report"
                          )}
                        </button>
                      </div>
                    </form>
                    {reportStatus === "closed" ? (
                      <button
                        className="checker-report-toggle"
                        onClick={openReportForm}
                        type="button"
                      >
                        Want a copy? Email yourself this report.
                      </button>
                    ) : (
                      <p className="checker-report-note">No newsletter. Just the report.</p>
                    )}
                    {reportErrorMessage && <p className="checker-report-error">{reportErrorMessage}</p>}
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

const HowWeWorkSection = forwardRef<HTMLElement, {
  id?: string;
  onStartProject: () => void;
}>(function HowWeWorkSection({ id, onStartProject }, ref) {
  const workCards = [
    {
      title: "Performance",
      copy: "The site works the way it's supposed to: fast, accessible, built well underneath.",
    },
    {
      title: "Sustainability",
      copy: "The site doesn't depend on us to survive. You can update it, keep it current, and hold onto it.",
    },
    {
      title: "Character",
      copy: "Not a template with your name on it. Every project starts from what's actually true about the client.",
    },
  ];

  return (
    <section className="how-work-section" id={id} aria-label="What We Prioritize" ref={ref}>
      <h2>What We Prioritize</h2>
      <div className="how-work-grid">
        {workCards.map((card) => (
          <article className="how-work-card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.copy}</p>
          </article>
        ))}
      </div>
      <div className="how-work-cta">
        <p>Ready to Start a Project?</p>
        <button type="button" onClick={onStartProject}>
          Contact Us
        </button>
      </div>
    </section>
  );
});

export default function Home() {
  const landingSceneRef = useRef<HTMLElement | null>(null);
  const lowerSceneRef = useRef<HTMLElement | null>(null);
  const portfolioSceneRef = useRef<HTMLElement | null>(null);
  const performanceSceneRef = useRef<HTMLDivElement | null>(null);
  const howWorkSceneRef = useRef<HTMLElement | null>(null);
  const [chromeProgress, setChromeProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const updateChromeProgress = () => {
      frameId = 0;

      const landingScene = landingSceneRef.current;

      if (!landingScene) {
        return;
      }

      const rect = landingScene.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const morphDistance = Math.min(360, Math.max(180, viewportHeight * 0.32));
      const morphStart = viewportHeight * 0.52;
      const nextProgress = clamp((morphStart - rect.bottom) / morphDistance);

      setChromeProgress((previousProgress) => {
        if (Math.abs(previousProgress - nextProgress) < 0.005) {
          return previousProgress;
        }

        return nextProgress;
      });
    };

    const scheduleUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateChromeProgress);
    };

    updateChromeProgress();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const moveToScene = useCallback((scene: Scene) => {
    const scrollToElement = (element: HTMLElement | null, offset = 0) => {
      if (!element) {
        return;
      }

      animateScroll({
        target: window,
        axis: "top",
        to: Math.max(0, window.scrollY + element.getBoundingClientRect().top - offset),
        duration: 780,
      });
    };

    if (scene === "landing") {
      scrollToElement(landingSceneRef.current);
      return;
    }

    window.requestAnimationFrame(() => {
      const sceneTargets = {
        about: howWorkSceneRef.current,
        portfolio: portfolioSceneRef.current,
        performance: performanceSceneRef.current,
      };

      const stickyOffset = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--footer-height"),
      ) || 0;

      scrollToElement(sceneTargets[scene], stickyOffset);
    });
  }, []);

  const startFixConversation = useCallback((message: string) => {
    window.location.assign(`/contact?message=${encodeURIComponent(message)}`);
  }, []);

  const heroNavItems = useMemo<MobileNavItem[]>(() => [
    {
      label: "Portfolio",
      onSelect: () => moveToScene("portfolio"),
    },
    {
      label: "Performance",
      onSelect: () => moveToScene("performance"),
    },
    {
      label: "Priorities",
      onSelect: () => moveToScene("about"),
    },
    {
      label: "Contact",
      onSelect: () => window.location.assign("/contact"),
    },
  ], [moveToScene]);

  const stickyNavItems = useMemo<MobileNavItem[]>(() => [
    {
      label: "Portfolio",
      onSelect: () => moveToScene("portfolio"),
    },
    {
      label: "Performance",
      onSelect: () => moveToScene("performance"),
    },
    {
      label: "Priorities",
      onSelect: () => moveToScene("about"),
    },
    {
      label: "Contact",
      onSelect: () => window.location.assign("/contact"),
    },
  ], [moveToScene]);

  const isCompactChrome = chromeProgress > 0.82;
  const mobileNavItems = chromeProgress > 0.56 ? stickyNavItems : heroNavItems;

  return (
    <main
      className={`scene-viewport${isCompactChrome ? " is-compact-chrome" : ""}`}
      style={{
        "--chrome-progress": chromeProgress,
      } as CSSProperties}
    >
      <div className="morph-chrome" aria-hidden={!isCompactChrome}>
        <button
          className="morph-brand"
          type="button"
          onClick={() => moveToScene("landing")}
          aria-label="Pebblesprings Studio home"
          tabIndex={isCompactChrome ? 0 : -1}
        >
          <span className="morph-brand-mark" aria-hidden="true">
            <img src="/PSLogo.png" alt="" width="98" height="98" />
          </span>
        </button>
        <nav className="morph-nav" aria-label="Primary navigation">
          <button
            type="button"
            onClick={() => moveToScene("portfolio")}
            tabIndex={isCompactChrome ? 0 : -1}
            className="morph-work-link"
          >
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => moveToScene("performance")}
            tabIndex={isCompactChrome ? 0 : -1}
          >
            Performance
          </button>
          <button
            type="button"
            onClick={() => moveToScene("about")}
            tabIndex={isCompactChrome ? 0 : -1}
          >
            Priorities
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/contact")}
            tabIndex={isCompactChrome ? 0 : -1}
            className="morph-project"
          >
            Start a Project
          </button>
        </nav>
      </div>
      <div className="scene-stack">
        <section
          className="studio-shell illustrated-hero scene-panel"
          id="home"
          aria-label="Pebblesprings Studio home"
          ref={landingSceneRef}
        >
          <img className="illustrated-hero-border" src="/WhiteBorder.svg" alt="" aria-hidden="true" />
          <div className="illustrated-hero-inner">
            <header className="illustrated-hero-header">
              <a className="illustrated-brand" href="#home" aria-label="Pebblesprings Studio home">
                <span className="illustrated-brand-mark" aria-hidden="true">
                  <img src="/PSLogo.png" alt="" width="98" height="98" />
                </span>
                <span>Pebblesprings<br />Studio</span>
              </a>
              <nav className="illustrated-hero-nav" aria-label="Primary navigation">
                <button type="button" onClick={heroNavItems[0].onSelect}>Portfolio</button>
                <button type="button" onClick={heroNavItems[1].onSelect}>Performance</button>
                <button type="button" onClick={heroNavItems[2].onSelect}>Priorities</button>
                <button className="illustrated-hero-project" type="button" onClick={() => window.location.assign("/contact")}>
                  Start a Project
                </button>
              </nav>
              <MobileNavMenu items={heroNavItems} />
            </header>

            <div className="illustrated-hero-copy">
              <h1>We build websites<br />people actually<br />enjoy using.</h1>
              <button className="illustrated-hero-work" type="button" onClick={() => moveToScene("about")}>
                See how we work
              </button>
            </div>
          </div>
        </section>

        <section
          className="lower-scene scene-panel"
          aria-label="Pebblesprings Studio performance and process"
          ref={lowerSceneRef}
        >
          <header className="lower-topbar" aria-label="Pebblesprings Studio navigation">
            <button
              className="topbar-brand"
              type="button"
              onClick={() => moveToScene("landing")}
              aria-label="Pebblesprings Studio home"
            >
              <img src="/PSLogo.png" alt="" width="32" height="32" />
              <span>
                Pebblesprings
                <br />
                Studio
              </span>
            </button>
            <nav className="lower-nav" aria-label="Primary navigation">
              <button type="button" onClick={stickyNavItems[0].onSelect}>
                Portfolio
              </button>
              <button type="button" onClick={stickyNavItems[1].onSelect}>
                Performance
              </button>
              <button type="button" onClick={stickyNavItems[2].onSelect}>
                Priorities
              </button>
              <button type="button" onClick={stickyNavItems[3].onSelect}>
                Contact
              </button>
            </nav>
            <MobileNavMenu items={mobileNavItems} />
          </header>
          <TransitionStatement />
          <section className="portfolio-section" id="portfolio" aria-label="Selected portfolio pieces" ref={portfolioSceneRef}>
            <div className="portfolio-section-heading">
              <p>Selected work.</p>
            </div>
            <PortfolioCarousel />
          </section>
          <div className="lower-content">
            <div id="performance" ref={performanceSceneRef}>
              <PerformanceSection onStartFix={startFixConversation} />
            </div>

            <HowWeWorkSection
              id="about"
              onStartProject={() => {
                window.location.assign("/contact");
              }}
              ref={howWorkSceneRef}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

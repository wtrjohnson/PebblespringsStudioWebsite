import { useEffect, useState } from "react";

export type ScoreKey = "speed" | "reach" | "reliability" | "visibility";

export type ScoreMetric = {
  key: ScoreKey;
  label: string;
  value: number;
};

const scoreLabels: Record<ScoreKey, string> = {
  speed: "Speed",
  reach: "Reach",
  reliability: "Reliability",
  visibility: "Visibility",
};

const scoreOrder: ScoreKey[] = ["speed", "reach", "reliability", "visibility"];

function toScoreMetrics(scores: Record<ScoreKey, number>): ScoreMetric[] {
  return scoreOrder.map((key) => ({
    key,
    label: scoreLabels[key],
    value: scores[key],
  }));
}

export function usePortfolioScores(fallback: ScoreMetric[]) {
  const [scores, setScores] = useState<ScoreMetric[]>(fallback);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/portfolio-scores")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { scores?: Record<ScoreKey, number> } | null) => {
        if (!cancelled && data?.scores) {
          setScores(toScoreMetrics(data.scores));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return scores;
}

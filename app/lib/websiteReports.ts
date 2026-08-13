import { createHash, randomBytes } from "node:crypto";
import type { PageSpeedAudit, PageSpeedReport, ScoreKey } from "./pagespeed";

export const REPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createReportToken() {
  return randomBytes(32).toString("base64url");
}

export function hashReportToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const labels: Record<ScoreKey, string> = {
  speed: "Speed",
  reach: "Reach",
  reliability: "Reliability",
  visibility: "Visibility",
};

function scoreCards(report: PageSpeedReport) {
  return (Object.keys(labels) as ScoreKey[]).map((key) =>
    `<div style="padding:18px;background:#f4f0eb;border-radius:12px"><div style="font-size:13px;color:#666">${labels[key]}</div><div style="font-size:36px;font-weight:700">${report.categories[key]}</div></div>`).join("");
}

function auditRows(audits: PageSpeedAudit[]) {
  return audits.map((audit) => `<li style="margin:0 0 12px"><strong>${escapeHtml(audit.title)}</strong>${audit.displayValue ? ` <span>${escapeHtml(audit.displayValue)}</span>` : ""}<br><span>${escapeHtml(audit.description)}</span></li>`).join("");
}

export function buildWebsiteReportEmail(report: PageSpeedReport, reportUrl: string) {
  const date = new Date(report.fetchedAt).toLocaleDateString("en-US", { dateStyle: "long" });
  const lowest = Math.min(...Object.values(report.categories));
  const summary = lowest >= 90 ? "Your site has a strong technical foundation." : lowest >= 50 ? "Your site has a solid foundation with a few areas worth improving." : "Your site has a few technical issues that may be costing visitors.";
  const metrics = report.metrics.slice(0, 7).map((metric) => `<li><strong>${escapeHtml(metric.title)}:</strong> ${escapeHtml(metric.displayValue ?? metric.numericValue ?? "Not available")}</li>`).join("");
  const findings = auditRows(report.findings.slice(0, 5));
  const safeUrl = escapeHtml(report.url);
  const html = `<!doctype html><html><body style="margin:0;background:#111;color:#171412;font-family:Arial,sans-serif"><div style="max-width:680px;margin:0 auto;background:#fff;padding:36px"><p style="color:#f4512a;font-weight:700">PEBBLESPRINGS STUDIO</p><h1 style="font-size:36px;margin-bottom:8px">Your website report</h1><p>${safeUrl}<br>${escapeHtml(date)} · Mobile test</p><p style="font-size:18px">${summary}</p><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">${scoreCards(report)}</div><h2>Key metrics</h2><ul>${metrics}</ul>${findings ? `<h2>Top findings</h2><ul>${findings}</ul>` : ""}<p style="margin:32px 0"><a href="${escapeHtml(reportUrl)}" style="background:#f4512a;color:#fff;padding:14px 20px;border-radius:999px;text-decoration:none;font-weight:700">Open the full report</a></p><p style="font-size:13px;color:#666">This private report link expires in seven days. No newsletter. Just the report.</p></div></body></html>`;
  const text = `PEBBLESPRINGS STUDIO\nYour website report\n\n${report.url}\n${date} · Mobile test\n\n${summary}\n\nScores\n${(Object.keys(labels) as ScoreKey[]).map((key) => `${labels[key]}: ${report.categories[key]}`).join("\n")}\n\nKey metrics\n${report.metrics.slice(0, 7).map((metric) => `${metric.title}: ${metric.displayValue ?? metric.numericValue ?? "Not available"}`).join("\n")}\n\nOpen the full report: ${reportUrl}\n\nThis private report link expires in seven days. No newsletter. Just the report.`;
  return { html, text };
}

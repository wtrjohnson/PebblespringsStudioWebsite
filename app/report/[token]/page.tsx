import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { websiteTestReports, websiteTests } from "../../../db/schema";
import { hashReportToken } from "../../lib/websiteReports";
import type { PageSpeedAudit, PageSpeedReport, ScoreKey } from "../../lib/pagespeed";

export const metadata = { title: "Website report | Pebblesprings Studio", robots: { index: false, follow: false } };

const labels: Record<ScoreKey, string> = { speed: "Speed", reach: "Reach", reliability: "Reliability", visibility: "Visibility" };

function auditStatus(audit: PageSpeedAudit) {
  if (audit.score === null) return "Informational";
  if (audit.score >= 0.9) return "Passed";
  if (audit.score >= 0.5) return "Needs attention";
  return "Needs work";
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb();
  const [access] = await db.select().from(websiteTestReports).where(eq(websiteTestReports.tokenHash, hashReportToken(token))).limit(1);
  const currentTime = new Date().toISOString();
  if (!access || access.revokedAt || !access.sentAt || access.expiresAt <= currentTime) notFound();
  const [test] = await db.select().from(websiteTests).where(eq(websiteTests.id, access.websiteTestId)).limit(1);
  const report = test?.reportData as PageSpeedReport | null;
  if (!test || !report || test.source !== "pagespeed") notFound();
  const date = new Date(report.fetchedAt).toLocaleDateString("en-US", { dateStyle: "long" });
  const audits = report.audits.filter((audit) => audit.group !== "metric" && audit.score !== null).slice(0, 30);
  const passed = report.audits.filter((audit) => audit.score !== null && audit.score >= 0.9).length;
  const warning = report.audits.filter((audit) => audit.score !== null && audit.score >= 0.5 && audit.score < 0.9).length;
  const failed = report.audits.filter((audit) => audit.score !== null && audit.score < 0.5).length;
  return <main className="website-report-page"><header className="website-report-header"><Link href="/" aria-label="Pebblesprings Studio home"><img src="/PSLogo.png" alt="" width="40" height="40" /></Link><span>Pebblesprings Studio</span></header><div className="website-report-content"><p className="privacy-kicker">Website report</p><h1>A closer look at your site.</h1><p className="website-report-meta">{report.url}<br />{date} · Mobile test · Private link expires in seven days</p><section className="website-report-scores" aria-label="Scores">{(Object.keys(labels) as ScoreKey[]).map((key) => <article key={key}><span>{labels[key]}</span><strong>{report.categories[key]}</strong></article>)}</section><section><h2>What these scores mean</h2><p className="website-report-explanation">Speed reflects loading and responsiveness. Reach covers accessibility across devices and assistive tools. Reliability covers technical best practices. Visibility covers how clearly search engines can understand the site.</p></section><section><h2>Core Web Vitals and key metrics</h2><div className="website-report-metrics">{report.metrics.map((metric) => <article key={metric.id}><strong>{metric.displayValue ?? "—"}</strong><span>{metric.title}</span></article>)}</div></section><section><h2>Audit summary</h2><div className="website-report-summary"><span>Passed <strong>{passed}</strong></span><span>Needs attention <strong>{warning}</strong></span><span>Needs work <strong>{failed}</strong></span></div></section><section><h2>What to work on</h2><div className="website-report-audits">{audits.map((audit) => <article key={audit.id}><div><h3>{audit.title}</h3><p>{audit.description}</p></div><span>{auditStatus(audit)}</span></article>)}</div></section></div></main>;
}

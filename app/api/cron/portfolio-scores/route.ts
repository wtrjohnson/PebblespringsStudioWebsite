import { runDailyPortfolioScoreCapture } from "../../../../db/portfolioScoreMonitoring";

export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await runDailyPortfolioScoreCapture();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to capture portfolio scores", error);
    return Response.json({ error: "Unable to capture portfolio scores." }, { status: 500 });
  }
}

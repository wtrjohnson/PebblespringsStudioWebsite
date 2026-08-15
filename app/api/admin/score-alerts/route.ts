import { requireAdmin } from "../../../../db/adminAuth";
import { getOpenPortfolioScoreAlerts } from "../../../../db/portfolioScoreMonitoring";

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  try {
    return Response.json({ alerts: await getOpenPortfolioScoreAlerts() });
  } catch (error) {
    console.error("Unable to load portfolio score alerts", error);
    return Response.json({ error: "Unable to load score alerts." }, { status: 500 });
  }
}

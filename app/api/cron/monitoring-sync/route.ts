import { syncOpsMonitoring } from "../../../../db/opsMonitoringSync";

export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return Response.json(await syncOpsMonitoring());
  } catch (error) {
    console.error("Unable to reconcile pebblesprings-ops monitoring data", error);
    return Response.json({ error: "Unable to reconcile monitoring data." }, { status: 502 });
  }
}

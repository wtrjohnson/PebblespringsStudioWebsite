import { syncOpsMonitoring, verifyOpsSignature } from "../../../../db/opsMonitoringSync";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyOpsSignature(body, request.headers.get("x-ops-signature"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(body) as { commitSha?: unknown };
  const commitSha = typeof payload.commitSha === "string" && /^[a-f0-9]{7,64}$/i.test(payload.commitSha)
    ? payload.commitSha
    : undefined;

  if (!commitSha) return Response.json({ error: "commitSha is required" }, { status: 400 });

  try {
    return Response.json(await syncOpsMonitoring({ ref: commitSha }));
  } catch (error) {
    console.error("Unable to import pebblesprings-ops monitoring data", error);
    return Response.json({ error: "Unable to import monitoring data." }, { status: 502 });
  }
}

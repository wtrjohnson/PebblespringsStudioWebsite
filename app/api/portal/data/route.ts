import { getPortalDataForClient } from "../../../../db/portal";
import { getCurrentPortalSession } from "../../../../db/portalAuth";

export async function GET(request: Request) {
  const session = await getCurrentPortalSession(request);

  if (!session) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const data = await getPortalDataForClient(session.clientId);
  return Response.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

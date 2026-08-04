import { getPortalDataForClient } from "../../../../db/portal";
import { getCurrentPortalSession } from "../../../../db/portalAuth";

export async function GET(request: Request) {
  const session = await getCurrentPortalSession(request);

  if (!session) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  try {
    const data = await getPortalDataForClient(session.clientId);

    if (!data) {
      return Response.json(
        { error: "no active project" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Unable to load portal data", error);
    return Response.json(
      { error: "unable to load portal data" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

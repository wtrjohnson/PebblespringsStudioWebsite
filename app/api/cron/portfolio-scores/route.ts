export async function GET() {
  return Response.json({ error: "This job was replaced by Ref and the monitoring sync." }, { status: 410 });
}

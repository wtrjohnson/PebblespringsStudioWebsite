import { getLedgerOverview } from "../../db/adminData";
import { refreshStaleProjectScores } from "../../db/adminScores";
import { requireAdminSession } from "./session.ts";
import { AdminConsole } from "./AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminLedgerPage() {
  await requireAdminSession();
  let overview = await getLedgerOverview();
  const projectIds = overview.lines.flatMap((line) => (line.projectId ? [line.projectId] : []));

  await refreshStaleProjectScores(projectIds);
  overview = await getLedgerOverview();

  return <AdminConsole initialLines={overview.lines} />;
}

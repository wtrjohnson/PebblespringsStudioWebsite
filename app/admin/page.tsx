import { getLedgerOverview } from "../../db/adminData";
import { requireAdminSession } from "./session.ts";
import { AdminConsole } from "./AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminLedgerPage() {
  await requireAdminSession();
  const overview = await getLedgerOverview();

  return <AdminConsole initialLines={overview.lines} monitoring={overview.monitoring} />;
}

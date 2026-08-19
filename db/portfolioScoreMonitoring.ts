import { desc, inArray } from "drizzle-orm";
import { getDb } from "./index";
import { portfolioScoreAlerts } from "./schema";

export async function getOpenPortfolioScoreAlerts(databaseUrl?: string) {
  const db = await getDb(databaseUrl);
  return db.select().from(portfolioScoreAlerts)
    .where(inArray(portfolioScoreAlerts.status, ["open", "acknowledged"]))
    .orderBy(desc(portfolioScoreAlerts.createdAt));
}

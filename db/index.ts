import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export async function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is unavailable. Add your Neon connection string to .env.local for local development and to Vercel environment variables before deploying."
    );
  }

  return drizzle(neon(databaseUrl), { schema });
}

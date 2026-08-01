import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

function getEnvValue(name: string) {
  if (process.env[name]) {
    return process.env[name];
  }

  if (!existsSync(".env.local")) {
    return "";
  }

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  const prefix = `${name}=`;
  const line = lines.find((entry) => entry.startsWith(prefix));

  return line?.slice(prefix.length).trim().replace(/^["']|["']$/g, "") ?? "";
}

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: getEnvValue("DATABASE_URL"),
  },
});

/**
 * Applies pending migrations, and optionally seeds a studio admin account.
 *
 * Wired to `postinstall` rather than only `build`: Vercel detects this project
 * as a framework and runs its own `vercel build`, bypassing the build script in
 * package.json entirely, but it always runs the install step. A deploy
 * therefore migrates itself using the DATABASE_URL already configured there —
 * no connection string ever has to be copied to a laptop. Drizzle records
 * applied migrations in __drizzle_migrations, so running on every install is a
 * no-op once current.
 *
 * When DATABASE_URL is absent (CI, a fresh clone, the test suite) it skips
 * rather than failing, so installs that never touch the database still work.
 */
import { existsSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { createPasswordSalt, hashPassword } from "./adminPassword.mjs";

function getEnvValue(name) {
  if (process.env[name]) {
    return process.env[name];
  }

  if (!existsSync(".env.local")) {
    return "";
  }

  const prefix = `${name}=`;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(prefix));

  return line?.slice(prefix.length).trim().replace(/^["']|["']$/g, "") ?? "";
}

/**
 * `vercel env pull` writes this placeholder for variables marked sensitive in
 * the dashboard, and it is easy to mistake for a real value — it produces an
 * "Invalid URL" several steps later. Name it early and plainly.
 */
function isPlaceholder(value) {
  return value === "[SENSITIVE]" || value.startsWith("paste_");
}

async function bootstrapAdmin(sql) {
  const email = getEnvValue("ADMIN_BOOTSTRAP_EMAIL").trim().toLowerCase();
  const password = getEnvValue("ADMIN_BOOTSTRAP_PASSWORD");
  const name = getEnvValue("ADMIN_BOOTSTRAP_NAME").trim();

  if (!email && !password) {
    return;
  }

  if (!email || !password) {
    console.warn(
      "[migrate] ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set together; skipping admin bootstrap.",
    );
    return;
  }

  if (isPlaceholder(password) || password.length < 12) {
    console.warn("[migrate] ADMIN_BOOTSTRAP_PASSWORD must be at least 12 real characters; skipping.");
    return;
  }

  const salt = createPasswordSalt();
  const passwordHash = await hashPassword(password, salt);

  await sql`
    INSERT INTO studio_admins (email, name, password_hash, password_salt, status)
    VALUES (${email}, ${name || email}, ${passwordHash}, ${salt}, 'active')
    ON CONFLICT (email) DO UPDATE
      SET name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          password_salt = EXCLUDED.password_salt,
          status = 'active'
  `;

  console.log(`[migrate] Studio admin ready: ${email}`);
  console.log(
    "[migrate] Remove ADMIN_BOOTSTRAP_* from the environment once you have signed in.",
  );
}

async function main() {
  const databaseUrl = getEnvValue("DATABASE_URL");

  if (!databaseUrl) {
    console.log("[migrate] DATABASE_URL is not set; skipping migrations.");
    return;
  }

  if (isPlaceholder(databaseUrl)) {
    throw new Error(
      'DATABASE_URL is the literal "[SENSITIVE]" placeholder. Vercel does not return the ' +
        "values of variables marked sensitive; unmark it in the dashboard or set a real " +
        "connection string.",
    );
  }

  console.log(`[migrate] Applying migrations to ${new URL(databaseUrl).host}`);

  const sql = neon(databaseUrl);
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("[migrate] Migrations up to date.");

  await bootstrapAdmin(sql);
}

await main();

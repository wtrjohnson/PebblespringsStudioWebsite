/**
 * One-off bootstrap for studio admin accounts. There is deliberately no signup
 * page — run this against the database to mint the first login.
 *
 *   npm run admin:create
 */
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { neon } from "@neondatabase/serverless";
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

async function main() {
  const databaseUrl = getEnvValue("DATABASE_URL");

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Add it to .env.local or the environment.");
    process.exitCode = 1;
    return;
  }

  if (databaseUrl === "[SENSITIVE]") {
    console.error(
      'DATABASE_URL is the literal "[SENSITIVE]" placeholder that `vercel env pull` writes\n' +
        "for variables marked sensitive. Unmark it in the Vercel dashboard, or paste the real\n" +
        "Neon connection string into .env.local.",
    );
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const email = (await rl.question("Email: ")).trim().toLowerCase();
    const name = (await rl.question("Name: ")).trim();
    const password = await rl.question("Password (min 12 characters): ");

    if (!email.includes("@")) {
      console.error("That email does not look valid.");
      process.exitCode = 1;
      return;
    }

    if (password.length < 12) {
      console.error("Password must be at least 12 characters.");
      process.exitCode = 1;
      return;
    }

    const salt = createPasswordSalt();
    const passwordHash = await hashPassword(password, salt);
    const sql = neon(databaseUrl);

    await sql`
      INSERT INTO studio_admins (email, name, password_hash, password_salt, status)
      VALUES (${email}, ${name}, ${passwordHash}, ${salt}, 'active')
      ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash,
            password_salt = EXCLUDED.password_salt,
            status = 'active'
    `;

    console.log(`\nAdmin ready: ${email}`);
    console.log("Sign in at /admin/login");
  } finally {
    rl.close();
  }
}

await main();

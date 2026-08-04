import { randomBytes } from "node:crypto";

/**
 * Must stay in step with db/adminAuth.ts. PBKDF2 via WebCrypto rather than
 * scrypt, because the same hashes are verified on Cloudflare's runtime, which
 * does not implement node:crypto's scrypt.
 */
export const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEY_BYTES = 32;

export function createPasswordSalt() {
  return randomBytes(16).toString("hex");
}

export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    PBKDF2_KEY_BYTES * 8,
  );

  return Buffer.from(bits).toString("hex");
}

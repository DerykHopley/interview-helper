// Access Tokens (CONTEXT.md; ADR 0002): a time-limited pass that lets a group use the app's LLM features.
// Format: IH-<LABEL>-<EXPIRY>-<SIGNATURE>, short enough to read out or paste, e.g. IH-COHORT1-1Z3K9QT-7M2XD9PQRW4TK6BA.
//   LABEL      the group's label, letters and digits (shown in usage logs)
//   EXPIRY     Unix seconds, Crockford base32
//   SIGNATURE  HMAC-SHA256 over "IH-<LABEL>-<EXPIRY>" with the Worker's secret, first 80 bits, Crockford base32.
//              RFC 2104 §5 suggests keeping at least half the hash (128 bits); 80 is a deliberate trade to keep the
//              token short enough to read out. Forging needs online guesses against the Worker, one per request, and
//              2^80 of them can't happen within a token's 7-day maximum lifetime.
// Rotating the secret invalidates every outstanding token. Uses Web Crypto, so it runs in the Worker and in Node.

import { ALPHABET, encodeBytes, fixConfusables } from "../../shared/crockford";
import type { AccessRefusal } from "../../shared/workerProtocol";

const PREFIX = "IH";
const SIGNATURE_BYTES = 10; // 80 bits
const LABEL = /^[a-z0-9]{1,24}$/;
/** The longest a token may last. ADR 0002's default is 8 hours; the owner may mint longer, up to a week. */
export const MAX_LIFETIME_HOURS = 7 * 24;
const MAX_LIFETIME_MS = MAX_LIFETIME_HOURS * 3_600_000;

export type AccessCheck = { ok: true; label: string; expiresAt: Date } | { ok: false; reason: AccessRefusal };

export async function mintAccessToken({ label, expiresAt, secret, now = new Date() }: { label: string; expiresAt: Date; secret: string; now?: Date }) {
  if (!LABEL.test(label)) throw new Error("A label is 1–24 lowercase letters or digits, with no hyphens, e.g. cohort1");
  if (expiresAt.getTime() - now.getTime() > MAX_LIFETIME_MS) throw new Error(`A token can last at most ${MAX_LIFETIME_HOURS} hours (7 days)`);
  const unsigned = `${PREFIX}-${label.toUpperCase()}-${encodeNumber(Math.floor(expiresAt.getTime() / 1000))}`;
  return `${unsigned}-${await sign(unsigned, secret)}`;
}

export async function checkAccessToken(token: string, secret: string, now = new Date()): Promise<AccessCheck> {
  const parts = token.trim().toUpperCase().split("-");
  if (parts.length !== 4 || parts[0] !== PREFIX) return { ok: false, reason: "invalid" };
  const [, label] = parts;
  const [expiry, signature] = [parts[2], parts[3]].map(fixConfusables);
  const seconds = decodeNumber(expiry);
  if (seconds === null || !LABEL.test(label.toLowerCase())) return { ok: false, reason: "invalid" };
  if (!timingSafeEqual(signature, await sign(`${PREFIX}-${label}-${expiry}`, secret))) return { ok: false, reason: "invalid" };
  const expiresAt = new Date(seconds * 1000);
  if (expiresAt <= now) return { ok: false, reason: "expired" };
  // Refuse tokens that outlive the maximum, whatever minted them.
  if (expiresAt.getTime() - now.getTime() > MAX_LIFETIME_MS) return { ok: false, reason: "invalid" };
  return { ok: true, label: label.toLowerCase(), expiresAt };
}

async function sign(message: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
  return encodeBytes(mac.slice(0, SIGNATURE_BYTES));
}

function encodeNumber(n: number) {
  let out = "";
  do { out = ALPHABET[n % 32] + out; n = Math.floor(n / 32); } while (n > 0);
  return out;
}

function decodeNumber(text: string) {
  let n = 0;
  for (const char of text) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) return null;
    n = n * 32 + digit;
  }
  return text.length ? n : null;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

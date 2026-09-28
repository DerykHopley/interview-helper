// PROTOTYPE — in-memory stand-in for the Access Token and Unlock Key logic (ADR 0002). No real crypto, no storage:
// the "stored" key is just held in state so the screens can be judged. Every variant uses this same hook.
import { useState } from "react";

// Made-up tokens for trying the screens. The real ones are signed by the Worker and carry a label + expiry.
export const SAMPLE_TOKENS = {
  valid: "IH-COHORT1-7Q2K-M9XD",
  expired: "IH-COHORT1-0X9P-4TRW",
};

export type TokenInfo = { label: string; expiresAt: number };
export type TokenResult = { ok: true; info: TokenInfo } | { ok: false; reason: "invalid" | "expired" };

const normalise = (s: string) => s.toUpperCase().replace(/[^0-9A-Z]/g, "");

export function checkToken(value: string): TokenResult {
  const v = normalise(value);
  if (v === normalise(SAMPLE_TOKENS.valid)) return { ok: true, info: { label: "cohort-1", expiresAt: Date.now() + 8 * 3600_000 } };
  if (v === normalise(SAMPLE_TOKENS.expired)) return { ok: false, reason: "expired" };
  return { ok: false, reason: "invalid" };
}

// Unlock Key: 6 groups of 4 Crockford base32 characters (no I, L, O, U) — 120 bits, easy to read aloud and type.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function generateUnlockKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const chars = Array.from(bytes, (b) => ALPHABET[b % 32]).join("");
  return chars.match(/.{4}/g)!.join("-");
}
// Crockford decoding: O reads as 0, I and L read as 1, so easily-confused characters still match.
const crockford = (s: string) => normalise(s).replace(/O/g, "0").replace(/[IL]/g, "1");
export const keysMatch = (a: string, b: string) => crockford(a) === crockford(b);

export const START_OVER_WORD = "DELETE";

export type Stage = "first-visit" | "locked" | "unlocked";
export type Scenario = "first-visit" | "returning" | "token-expired" | "no-token";

export function useAccess() {
  const initial = (new URLSearchParams(location.search).get("scenario") as Scenario) ?? "first-visit";
  const [stage, setStage] = useState<Stage>(initial === "first-visit" ? "first-visit" : initial === "returning" ? "locked" : "unlocked");
  const [storedKey, setStoredKey] = useState<string | null>(initial === "first-visit" ? null : "7KQF-M2XD-9HRT-4VNC-P8WB-3JZE");
  const [token, setToken] = useState<TokenInfo | null>(initial === "first-visit" || initial === "no-token" || initial === "token-expired" ? null : { label: "cohort-1", expiresAt: Date.now() + 6 * 3600_000 });
  const [tokenExpired, setTokenExpired] = useState(initial === "token-expired");
  const [newKey, setNewKey] = useState(generateUnlockKey);
  const [demoData, setDemoData] = useState(false);
  const [resetKey, setResetKey] = useState(0); // bumps on jump / start over, so variants drop their step state

  const jump = (s: Scenario) => {
    setStage(s === "first-visit" ? "first-visit" : s === "returning" ? "locked" : "unlocked");
    setStoredKey(s === "first-visit" ? null : "7KQF-M2XD-9HRT-4VNC-P8WB-3JZE");
    setToken(s === "first-visit" || s === "no-token" || s === "token-expired" ? null : { label: "cohort-1", expiresAt: Date.now() + 6 * 3600_000 });
    setTokenExpired(s === "token-expired");
    setNewKey(generateUnlockKey());
    setResetKey((k) => k + 1);
    const url = new URL(location.href);
    url.searchParams.set("scenario", s);
    history.replaceState(null, "", url);
  };

  return {
    stage,
    storedKey,
    token,
    tokenExpired,
    newKey,
    demoData,
    resetKey,
    /** Returns null on success, or why the token was refused. */
    submitToken(value: string): "invalid" | "expired" | null {
      const r = checkToken(value);
      if (!r.ok) return r.reason;
      setToken(r.info);
      setTokenExpired(false);
      return null;
    },
    finishSetup(withDemo: boolean) {
      setStoredKey(newKey);
      setDemoData(withDemo);
      setStage("unlocked");
    },
    /** Returns true if the key matched. */
    unlock(value: string) {
      if (!storedKey || !keysMatch(value, storedKey)) return false;
      setStage("unlocked");
      return true;
    },
    lock: () => setStage("locked"),
    /** Wipes everything and runs first-visit setup with a new key (story 19–20). */
    startOver() {
      setStoredKey(null);
      setToken(null);
      setTokenExpired(false);
      setDemoData(false);
      setNewKey(generateUnlockKey());
      setResetKey((k) => k + 1);
      setStage("first-visit");
    },
    expireToken: () => { setToken(null); setTokenExpired(true); },
    jump,
  };
}

export type Access = ReturnType<typeof useAccess>;

export const hoursLeft = (t: TokenInfo) => Math.max(0, Math.round((t.expiresAt - Date.now()) / 3600_000));

export function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

export function downloadKey(key: string) {
  const blob = new Blob([`Interview Helper — Unlock Key\n\n${key}\n\nKeep this safe. Without it your saved stories cannot be recovered.\n`], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "interview-helper-unlock-key.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

// The Unlock Key (GLOSSARY.md; ADR 0002): app-generated, so it can't be weak. 120 random bits as 6 groups of 4
// Crockford base32 characters, e.g. 7KQF-M2XD-9HRT-4VNC-P8WB-3JZE.
import { encodeBytes } from "../../shared/crockford";

const KEY_BYTES = 15; // 120 bits, exactly 24 base32 characters

export function generateUnlockKey() {
  return encodeBytes(crypto.getRandomValues(new Uint8Array(KEY_BYTES))).match(/.{4}/g)!.join("-");
}

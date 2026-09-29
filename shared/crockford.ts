// Crockford base32, shared by Access Tokens (Worker) and Unlock Keys (app): easy to read out, with no I, L, O, U.
export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Maps characters people confuse (O→0, I/L→1) so hand-typed text still matches. Expects upper case. */
export const fixConfusables = (text: string) => text.replace(/O/g, "0").replace(/[IL]/g, "1");

export function encodeBytes(bytes: Uint8Array) {
  let bits = 0, value = 0, out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

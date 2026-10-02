// Small text helpers shared across screens: wording, quotes and fingerprints.

/** "Question" for one, "Questions" otherwise. */
export const wordFor = (n: number, word: string) => (n === 1 ? word : `${word}s`);

/** "1 Question", "3 Questions". */
export const countOf = (n: number, word: string) => `${n} ${wordFor(n, word)}`;

/** "has" for one, "have" otherwise. */
export const hasOrHave = (n: number) => (n === 1 ? "has" : "have");

/** "1 Scenario couldn't be read, so it isn't shown." */
export const unreadableNotice = (n: number, word: string) =>
  `${countOf(n, word)} couldn't be read, so ${n === 1 ? "it isn't" : "they aren't"} shown.`;

/** Whether `quote` is in `text` word for word, ignoring case and spacing: how a model's quotes are checked (Feedback,
 * the Readiness Report). */
export function contains(text: string, quote: string) {
  const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  return normalise(quote) !== "" && normalise(text).includes(normalise(quote));
}

/** A short hash of some text (FNV-1a), to tell later whether it has changed. */
export function fingerprintOf(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, "0");
}

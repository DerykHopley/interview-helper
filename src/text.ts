// Small wording helpers shared across screens.

/** "Question" for one, "Questions" otherwise. */
export const wordFor = (n: number, word: string) => (n === 1 ? word : `${word}s`);

/** "1 Question", "3 Questions". */
export const countOf = (n: number, word: string) => `${n} ${wordFor(n, word)}`;

/** "1 Scenario couldn't be read, so it isn't shown." */
export const unreadableNotice = (n: number, word: string) =>
  `${countOf(n, word)} couldn't be read, so ${n === 1 ? "it isn't" : "they aren't"} shown.`;

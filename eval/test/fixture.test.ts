import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isGap, loadEvaluationSet } from "../src/evaluationSet";

const SETS = "eval/sets";
const PRIVATE = "eval/private/scenarios.md";

/** The terms under the "Never mention" heading of the owner's git-ignored real Scenarios: one per bullet, until the
 * next heading. Kept out of the repo, so this check runs only where that file exists. */
function neverMention(): string[] {
  if (!existsSync(PRIVATE)) return [];
  const lines = readFileSync(PRIVATE, "utf8").split("\n");
  const start = lines.findIndex((line) => /^#+\s*Never mention/i.test(line));
  if (start < 0) return [];
  const end = lines.findIndex((line, i) => i > start && /^#+\s/.test(line));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .map((line) => /^\s*[-*]\s+(.+?)\s*$/.exec(line)?.[1])
    .filter((term): term is string => !!term);
}

/** Every file git would commit: tracked ones, and new ones it doesn't ignore. */
const committable = () =>
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split("\n")
    .filter((file) => file && existsSync(file));

describe("the committed starter Evaluation Set", () => {
  it("loads, with Gaps and adversarial cases", () => {
    const set = loadEvaluationSet(join(SETS, "fixture"));

    expect(set.scenarios.length).toBeGreaterThanOrEqual(6);
    expect(set.questions.filter((q) => isGap(q.label)).length).toBeGreaterThanOrEqual(4);
    expect(set.adversarial.length).toBeGreaterThanOrEqual(2);
  });
});

describe("the public repo", () => {
  const terms = neverMention();
  it.skipIf(terms.length === 0)("leaves the owner's \"Never mention\" list out of every committed file (local only)", () => {
    const found = committable().flatMap((file) => {
      const bytes = readFileSync(file);
      if (bytes.includes(0)) return []; // binary (screenshots): its compressed bytes spell short terms by chance
      const text = bytes.toString("utf8").toLowerCase();
      return terms.filter((term) => text.includes(term.toLowerCase())).map((term) => `${file}: ${term}`);
    });

    expect(found).toEqual([]);
  });
});

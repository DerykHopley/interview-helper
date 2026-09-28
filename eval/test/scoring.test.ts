import { describe, expect, it } from "vitest";
import type { Matcher } from "../../src/matching/Matcher";
import { scoreMatchers } from "../src/scoring";

const fakeMatcher: Matcher = { name: "fake", rank: () => Promise.resolve([]) };

describe("the evaluation harness", () => {
  it("scores no Questions when the Evaluation Set is empty", async () => {
    const report = await scoreMatchers({ evaluationSet: { scenarios: [], questions: [] }, matchers: [fakeMatcher] });

    expect(report.matchers).toEqual([{ name: "fake", questionsScored: 0 }]);
  });
});

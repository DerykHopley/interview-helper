import { describe, expect, it } from "vitest";
import { MATCHING_CONFIG, type MatcherSetup } from "../../src/matching/matchingConfig";
import { PROMPT_VARIANTS } from "../../src/matching/promptVariants";
import { reportPlan, reportsDirFor } from "../src/reportPlan";
import { parseRawReport, type RawReport } from "../src/rawReport";
import { scoreRuns } from "../src/scoring";

const SHIPPED: MatcherSetup = { promptVariant: "rubric-zero-shot", model: "openai/gpt-5-mini", reasoningEffort: "low" };
const key = (s: MatcherSetup) => `${s.promptVariant}/${s.model}/${s.reasoningEffort}`;

describe("what a report with every Setup runs", () => {
  it("runs every Prompt Variant on the shipped model and effort, and each compared effort on the shipped variant, once each", () => {
    const { setups, sections } = reportPlan(SHIPPED);

    expect(new Set(setups.map(key)).size).toBe(setups.length);
    expect(sections.map((s) => s.title)).toEqual(["Prompt Variants", "Reasoning effort"]);
    const [variants, efforts] = sections;
    expect(variants.setups.map((s) => s.promptVariant).sort()).toEqual(Object.keys(PROMPT_VARIANTS).sort());
    expect(variants.setups.every((s) => s.model === SHIPPED.model && s.reasoningEffort === SHIPPED.reasoningEffort)).toBe(true);
    expect(efforts.setups.map((s) => s.reasoningEffort)).toEqual(["minimal", "low", "medium"]);
    expect(efforts.setups.every((s) => s.promptVariant === SHIPPED.promptVariant)).toBe(true);
    expect(setups.map(key)).toContain(key(SHIPPED));
  });

  it("starts from what the app ships", () => {
    expect(reportPlan(MATCHING_CONFIG).setups.map(key)).toContain(key(MATCHING_CONFIG));
  });
});

describe("the raw scores saved with a report", () => {
  it("read back to the same scores, so a report can be rendered again without new calls", () => {
    const set = { scenarios: [], questions: [{ id: "q1", text: "T", label: { gap: true as const } }], adversarial: [] };
    const runs = [{ name: "M", questions: [{ questionId: "q1", ranking: [{ scenarioId: "A", score: 10 }], cost: 0.001, ms: 900 }], adversarial: [] }];
    const saved = JSON.stringify({ date: "2026-10-01", setName: "s", set, shipped: "M", results: [{ name: "M", models: ["m"], runs }], sections: [] } satisfies RawReport);

    const back = parseRawReport(saved);

    expect(back.results[0].runs).toEqual(runs);
    expect(scoreRuns(back.results[0].runs, back.set.questions)).toEqual(scoreRuns(runs, set.questions));
  });

  it("refuses a file that isn't one", () => {
    expect(() => parseRawReport('{"date": 1}')).toThrow();
  });
});

describe("where a report is written", () => {
  it("keeps a report on a private Evaluation Set out of the committed reports", () => {
    expect(reportsDirFor("eval/sets/fixture")).toBe("eval/reports");
    expect(reportsDirFor("eval/private/real-set")).toBe("eval/private/reports");
    expect(reportsDirFor("./eval/private/real-set")).toBe("eval/private/reports");
  });
});

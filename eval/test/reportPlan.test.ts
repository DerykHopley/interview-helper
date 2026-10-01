import { describe, expect, it } from "vitest";
import { MATCHING_CONFIG, type MatcherSetup } from "../../src/matching/matchingConfig";
import { PROMPT_VARIANTS } from "../../src/matching/promptVariants";
import { COMPARED_MODELS, reportPlan, reportsDirFor } from "../src/reportPlan";
import { parseRawReport, type RawReport } from "../src/rawReport";
import { scoreCalibration } from "../src/reasons";
import { scoreRuns } from "../src/scoring";

const SHIPPED: MatcherSetup = { promptVariant: "rubric-zero-shot", model: "openai/gpt-5-mini", reasoningEffort: "low" };
const key = (s: MatcherSetup) => `${s.promptVariant}/${s.model}/${s.reasoningEffort}`;

describe("what a report with every Setup runs", () => {
  it("runs every Prompt Variant on the shipped model and effort, and each compared effort on the shipped variant, once each", () => {
    const { setups, sections } = reportPlan(SHIPPED, { allSetups: true });

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
    expect(reportPlan(MATCHING_CONFIG, { allSetups: true }).setups.map(key)).toContain(key(MATCHING_CONFIG));
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

  it("keep the reason judge's runs too", () => {
    const set = { scenarios: [], questions: [], adversarial: [], calibration: [{ id: "c1", questionId: "q1", scenarioId: "A", reason: "R", grounded: false, answers: true }] };
    const reasons: RawReport["reasons"] = {
      judgeModel: "google/gemini-3.8-flash",
      runs: [{ model: "m", checks: [{ questionId: "q1", scenarioId: "A", rank: 1, reason: "You did it.", grounded: false, answers: true, note: "made up", form: [] }], failed: [], cost: 0.001, judgeCost: 0.0005, ms: [900], questions: 1 }],
      calibration: { judgeModel: "google/gemini-3.8-flash", cost: 0, failed: [], items: [{ id: "c1", expected: { grounded: false, answers: true }, got: { grounded: true, answers: true, note: null } }] },
    };
    const back = parseRawReport(JSON.stringify({ date: "d", setName: "s", set, shipped: "M", sections: [], results: [], reasons } satisfies RawReport));

    expect(back.reasons).toEqual(reasons);
    expect(back.set.calibration).toEqual(set.calibration);
    expect(scoreCalibration(back.reasons!.calibration).misses).toEqual([{ id: "c1", wrong: ["grounded"] }]);
  });

  it("refuses a file that isn't one", () => {
    expect(() => parseRawReport('{"date": 1}')).toThrow();
  });
});

describe("what a report with models runs", () => {
  it("runs the shipped variant and effort on each compared model, with the shipped one in the list once", () => {
    const { setups, sections } = reportPlan(SHIPPED, { models: ["openai/gpt-5-nano", "openai/gpt-5-mini", "google/gemini-3.8-flash"] });

    expect(sections.map((s) => s.title)).toEqual(["Models"]);
    expect(sections[0].setups.map((s) => s.model)).toEqual(["openai/gpt-5-nano", "openai/gpt-5-mini", "google/gemini-3.8-flash"]);
    expect(setups.every((s) => s.promptVariant === SHIPPED.promptVariant && s.reasoningEffort === SHIPPED.reasoningEffort)).toBe(true);
    expect(setups).toHaveLength(3);
  });

  it("combines with every Setup, running the shipped one once", () => {
    const { setups, sections } = reportPlan(SHIPPED, { allSetups: true, models: ["openai/gpt-5-mini", "google/gemini-3.8-flash"] });

    expect(sections.map((s) => s.title)).toEqual(["Prompt Variants", "Reasoning effort", "Models"]);
    expect(setups.filter((s) => key(s) === key(SHIPPED))).toHaveLength(1);
    expect(setups).toHaveLength(8); // 5 variants, 2 other efforts, 1 other model
  });

  it("offers the models on the owner's allow-list, with the shipped model among them", () => {
    expect(COMPARED_MODELS).toContain(MATCHING_CONFIG.model);
    expect(COMPARED_MODELS).not.toContain("openai/gpt-5"); // not on the allow-list; gpt-5.4 stands in
  });
});

describe("where a report is written", () => {
  it("keeps a report on a private Evaluation Set out of the committed reports", () => {
    expect(reportsDirFor("eval/sets/fixture")).toBe("eval/reports");
    expect(reportsDirFor("eval/private/real-set")).toBe("eval/private/reports");
    expect(reportsDirFor("./eval/private/real-set")).toBe("eval/private/reports");
  });
});

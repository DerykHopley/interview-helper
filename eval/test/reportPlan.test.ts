import { describe, expect, it } from "vitest";
import { MATCHING_CONFIG, type LlmMatcherSetup, type MatcherSetup } from "../../src/matching/matchingConfig";
import { PROMPT_VARIANTS } from "../../src/matching/promptVariants";
import { COMPARED_MODELS, reportPlan, reportsDirFor } from "../src/reportPlan";
import { parseRawReport, type RawReport } from "../src/rawReport";
import { scoreCalibration } from "../src/reasons";
import { scoreRuns } from "../src/scoring";

const SHIPPED: LlmMatcherSetup = { matcher: "llm", promptVariant: "rubric-zero-shot", model: "openai/gpt-5-mini", reasoningEffort: "low" };
const key = (s: MatcherSetup) => (s.matcher === "llm" ? `${s.promptVariant}/${s.model}/${s.reasoningEffort}` : `jev/${s.ask}/${s.model}`);
const llm = (setups: MatcherSetup[]) => setups.filter((s): s is LlmMatcherSetup => s.matcher === "llm");

describe("what a report with every Setup runs", () => {
  it("runs every Prompt Variant on the shipped model and effort, and each compared effort on the shipped variant, once each", () => {
    const { setups, sections } = reportPlan(SHIPPED, { allSetups: true });

    expect(new Set(setups.map(key)).size).toBe(setups.length);
    expect(sections.map((s) => s.title)).toEqual(["Prompt Variants", "Reasoning effort"]);
    const [variants, efforts] = sections.map((s) => ({ ...s, setups: llm(s.setups) }));
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

describe("what a report with Jev runs (#20)", () => {
  it("adds a Jev section with each way of asking, beside the shipped Setup", () => {
    const { setups, sections } = reportPlan(SHIPPED, { jev: true });

    expect(sections.map((s) => s.title)).toEqual(["Jev"]);
    expect(sections[0].setups.map(key)).toEqual(["jev/choice/typesafe/jev-1.13", "jev/yes-no/typesafe/jev-1.13"]);
    // The shipped Setup runs too, so the report compares Jev with what ships.
    expect(setups.map(key)).toEqual([key(SHIPPED), "jev/choice/typesafe/jev-1.13", "jev/yes-no/typesafe/jev-1.13"]);
  });

  it("refuses the LLM comparisons when a Jev Setup ships, since they vary an LLM Setup", () => {
    const shippedJev: MatcherSetup = { matcher: "jev", ask: "yes-no", model: "typesafe/jev-1.13" };

    expect(reportPlan(shippedJev, { jev: true }).setups.map(key)).toEqual(["jev/yes-no/typesafe/jev-1.13", "jev/choice/typesafe/jev-1.13"]);
    expect(() => reportPlan(shippedJev, { allSetups: true })).toThrow(/LLM Setup/);
    expect(() => reportPlan(shippedJev, { models: ["openai/gpt-5-nano"] })).toThrow(/LLM Setup/);
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
    expect(setups.every((s) => s.matcher === "llm" && s.promptVariant === SHIPPED.promptVariant && s.reasoningEffort === SHIPPED.reasoningEffort)).toBe(true);
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

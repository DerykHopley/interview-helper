import { describe, expect, it } from "vitest";
import { withThreshold } from "../src/gapThresholds";

describe("recording a Gap threshold", () => {
  it("records a report's threshold for its Matcher, keeping the others", () => {
    const before = { "LLM (Rubric, zero-shot)": { gapThreshold: 50, report: null }, Jev: { gapThreshold: 0.4, report: "eval/reports/old.md" } };

    expect(withThreshold(before, "LLM (Rubric, zero-shot)", 62, "eval/reports/2026-10-01-matcher-report.md")).toEqual({
      "LLM (Rubric, zero-shot)": { gapThreshold: 62, report: "eval/reports/2026-10-01-matcher-report.md" },
      Jev: { gapThreshold: 0.4, report: "eval/reports/old.md" },
    });
  });
});

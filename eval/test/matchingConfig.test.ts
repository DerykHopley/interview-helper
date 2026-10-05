import { describe, expect, it } from "vitest";
import { createMatcher, measuredSetups } from "../../src/matching/matchingConfig";
import type { ModelGateway } from "../../src/model-gateway/ModelGateway";

const gateway = {} as ModelGateway;

describe("choosing a Matcher by its Setup (#20)", () => {
  it("makes the LLM or the Jev Matcher, by the Setup's kind", () => {
    expect(createMatcher(gateway, { matcher: "llm", promptVariant: "rubric-zero-shot", model: "openai/gpt-5-mini", reasoningEffort: "low" }).name).toBe(
      "LLM (Rubric, zero-shot) · openai/gpt-5-mini · low effort",
    );
    expect(createMatcher(gateway, { matcher: "jev", ask: "noul", model: "typesafe/jev-1.13" }).name).toBe("Jev (noul) · typesafe/jev-1.13");
  });

  it("reads back every measured Setup from its Matcher name, LLM and Jev alike, so the Developer panel can pick one", () => {
    const recorded = {
      "LLM (Few-shot) · openai/gpt-5-nano · minimal effort": { gapThreshold: 70, report: "r.md" },
      "Jev (choice) · typesafe/jev-1.13": { gapThreshold: 41.5, report: "r.md" },
      "Jev (noul) · typesafe/jev-1.13": { gapThreshold: 62, report: "r.md" },
      "Jev (essay) · typesafe/jev-1.13": { gapThreshold: 1, report: "r.md" },
      "LLM (Gone variant) · openai/gpt-5-mini · low effort": { gapThreshold: 1, report: "r.md" },
    };

    expect(measuredSetups(recorded)).toEqual([
      { name: "LLM (Few-shot) · openai/gpt-5-nano · minimal effort", setup: { matcher: "llm", promptVariant: "few-shot", model: "openai/gpt-5-nano", reasoningEffort: "minimal" }, gapThreshold: 70 },
      { name: "Jev (choice) · typesafe/jev-1.13", setup: { matcher: "jev", ask: "choice", model: "typesafe/jev-1.13" }, gapThreshold: 41.5 },
      { name: "Jev (noul) · typesafe/jev-1.13", setup: { matcher: "jev", ask: "noul", model: "typesafe/jev-1.13" }, gapThreshold: 62 },
    ]);
  });
});

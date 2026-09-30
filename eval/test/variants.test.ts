import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { createLlmMatcher } from "../../src/matching/llmMatcher";
import type { ScenarioText } from "../../src/matching/Matcher";
import { DATA_RULE, PROMPT_VARIANTS } from "../../src/matching/promptVariants";
import type { ModelGateway, StructuredRequest } from "../../src/model-gateway/ModelGateway";

const SCENARIOS: ScenarioText[] = ["A", "B"].map((id) => ({
  id,
  title: `Scenario ${id}`,
  role: "Lead",
  skills: ["delivery"],
  situation: "S",
  task: "T",
  action: "A",
  result: "R",
  measurableResults: [],
}));
const QUESTION = { text: "Tell me about a late project.", skill: "delivery" };

/** A gateway that records each request and replies with a score of 50 for every Scenario it was sent. */
function recordingGateway() {
  const requests: StructuredRequest<z.ZodType>[] = [];
  const gateway = {
    generate(request: StructuredRequest<z.ZodType>) {
      requests.push(request);
      const ids = [...request.user.matchAll(/"id":"(S\d+)"/g)].map((m) => m[1]);
      return Promise.resolve(request.schema.parse({ notes: "", scores: ids.map((id) => ({ id, score: 50 })) }));
    },
  } as unknown as ModelGateway;
  return { gateway, requests };
}

describe("the Prompt Variants", () => {
  const asked = Object.entries(PROMPT_VARIANTS).map(async ([id, variant]) => {
    const { gateway, requests } = recordingGateway();
    await createLlmMatcher(gateway, variant, { model: "openai/gpt-5-mini", reasoningEffort: "low" }).rank(QUESTION, SCENARIOS);
    return { id, name: variant.name, request: requests[0] };
  });

  it("are five or more, one per technique", async () => {
    const ids = (await Promise.all(asked)).map((a) => a.id);

    expect(ids).toEqual(expect.arrayContaining(["zero-shot", "few-shot", "chain-of-thought", "persona", "rubric-zero-shot"]));
  });

  it("differ only in their system prompt: the same message, output schema, model and effort for every one", async () => {
    const all = await Promise.all(asked);
    const [first] = all;

    expect(new Set(all.map((a) => a.request.system)).size).toBe(all.length);
    for (const { request } of all) {
      expect(request.user).toBe(first.request.user);
      expect(request.schema).toBe(first.request.schema);
      expect(request).toMatchObject({ job: "matching", model: "openai/gpt-5-mini", reasoningEffort: "low" });
    }
  });

  it("all end with the rule that keeps the Question and Scenarios as data", async () => {
    for (const { request } of await Promise.all(asked)) expect(request.system.endsWith(DATA_RULE)).toBe(true);
  });

  it("cuts long reasoning in notes short, rather than failing the call", async () => {
    const gateway = {
      generate: (request: StructuredRequest<z.ZodType>) =>
        Promise.resolve(request.schema.parse({ notes: "Thinking. ".repeat(1000), scores: [{ id: "S1", score: 90 }, { id: "S2", score: 10 }] })),
    } as unknown as ModelGateway;

    const ranked = await createLlmMatcher(gateway, PROMPT_VARIANTS["chain-of-thought"], { model: "openai/gpt-5-mini", reasoningEffort: "low" }).rank(QUESTION, SCENARIOS);

    expect(ranked).toEqual([
      { scenarioId: "A", score: 90 },
      { scenarioId: "B", score: 10 },
    ]);
  });

  it("name the Matcher by variant, model and effort, so each has its own threshold", () => {
    const { gateway } = recordingGateway();

    expect(createLlmMatcher(gateway, PROMPT_VARIANTS["few-shot"], { model: "openai/gpt-5-mini", reasoningEffort: "medium" }).name).toBe(
      "LLM (Few-shot) · openai/gpt-5-mini · medium effort",
    );
  });
});

import { describe, expect, it } from "vitest";
import { createJevMatcher } from "../../src/matching/jevMatcher";
import type { ScenarioText } from "../../src/matching/Matcher";
import { DATA_RULE } from "../../src/matching/promptVariants";
import { IncompleteReplyError } from "../../src/matching/shortIds";
import type { DecisionAnswer, DecisionRequest, ModelGateway } from "../../src/model-gateway/ModelGateway";

const scenario = (id: string, title: string): ScenarioText => ({
  id,
  title,
  role: "Lead",
  skills: ["delivery"],
  situation: `Situation of ${title}`,
  task: "T",
  action: "A",
  result: "R",
  measurableResults: ["Shipped 2 weeks early"],
});
const SCENARIOS = [scenario("vault-id-a", "Rescued a late migration"), scenario("vault-id-b", "Hired three engineers")];
const QUESTION = { text: "Tell me about a late project.", skill: "delivery" };

/** A gateway that records each decision request and answers with `answer`. */
function decidingGateway(answer: (request: DecisionRequest<string>) => Record<string, DecisionAnswer>) {
  const requests: DecisionRequest<string>[] = [];
  const gateway = {
    decide(request: DecisionRequest<string>) {
      requests.push(request);
      return Promise.resolve(answer(request));
    },
  } as unknown as ModelGateway;
  return { gateway, requests };
}

describe("the Jev Matcher, asking one choice among the Scenarios (#20)", () => {
  const choice = (probabilities: Record<string, number>): Record<string, DecisionAnswer> => ({ best: { type: "choice", choice: "S1", probabilities } });

  it("offers every Scenario, under a short id, and 'none of them', in one call, and scores each by its probability", async () => {
    const { gateway, requests } = decidingGateway(() => choice({ S1: 0.725, S2: 0.2, none: 0.075 }));

    const ranked = await createJevMatcher(gateway, { model: "typesafe/jev-1.13", ask: "choice" }).rank(QUESTION, SCENARIOS);

    expect(ranked).toEqual([
      { scenarioId: "vault-id-a", score: 72.5 },
      { scenarioId: "vault-id-b", score: 20 },
    ]);
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request).toMatchObject({ job: "jev-matching", model: "typesafe/jev-1.13" });
    expect(request.state).toContain(JSON.stringify({ text: QUESTION.text, skill: "delivery" }));
    const best = request.questions.best;
    expect(best.type).toBe("choice");
    if (best.type !== "choice") return;
    expect(Object.keys(best.criteria)).toEqual(["S1", "S2", "none"]);
    // Jev never sees the keys, so each option carries its whole Scenario, and never the Vault's id.
    expect(best.criteria.S1).toContain("Rescued a late migration");
    expect(best.criteria.S1).toContain("Shipped 2 weeks early");
    expect(JSON.stringify(request)).not.toContain("vault-id");
    expect(best.instructions).toContain(DATA_RULE);
  });

  it("scores an option Jev's reply leaves out as 0, since its probabilities cover the options it gave any", async () => {
    const { gateway } = decidingGateway(() => choice({ S1: 0.9, none: 0.1 }));

    const ranked = await createJevMatcher(gateway, { model: "typesafe/jev-1.13", ask: "choice" }).rank(QUESTION, SCENARIOS);

    expect(ranked).toEqual([
      { scenarioId: "vault-id-a", score: 90 },
      { scenarioId: "vault-id-b", score: 0 },
    ]);
  });

  it("refuses a reply with no probabilities at all", async () => {
    const { gateway } = decidingGateway(() => ({ best: { type: "choice", choice: "S1" } }));

    await expect(createJevMatcher(gateway, { model: "typesafe/jev-1.13", ask: "choice" }).rank(QUESTION, SCENARIOS)).rejects.toBeInstanceOf(IncompleteReplyError);
  });
});

describe("the Jev Matcher, asking yes or no for each Scenario (#20)", () => {
  it("asks one question per Scenario, all in one call, and scores each by its probability of yes", async () => {
    const { gateway, requests } = decidingGateway(() => ({ S1: { type: "noul", noul: 0.875 }, S2: { type: "noul", noul: 0.1 } }));

    const ranked = await createJevMatcher(gateway, { model: "typesafe/jev-1.13", ask: "yes-no" }).rank(QUESTION, SCENARIOS);

    expect(ranked).toEqual([
      { scenarioId: "vault-id-a", score: 87.5 },
      { scenarioId: "vault-id-b", score: 10 },
    ]);
    expect(requests).toHaveLength(1);
    const { questions } = requests[0];
    expect(Object.keys(questions)).toEqual(["S1", "S2"]);
    expect(questions.S1).toMatchObject({ type: "noul", criteria: { true: expect.any(String) as unknown, false: expect.any(String) as unknown } });
    expect(questions.S1.instructions).toContain("Rescued a late migration");
    expect(questions.S2.instructions).toContain("Hired three engineers");
    expect(questions.S1.instructions).toContain(DATA_RULE);
    expect(JSON.stringify(requests[0])).not.toContain("vault-id");
  });
});

describe("the Jev Matcher's name", () => {
  it("says how it asks and which model, so each has its own recorded threshold", () => {
    const { gateway } = decidingGateway(() => ({}));

    expect(createJevMatcher(gateway, { model: "typesafe/jev-1.13", ask: "choice" }).name).toBe("Jev (choice) · typesafe/jev-1.13");
    expect(createJevMatcher(gateway, { model: "typesafe/jev-1.13", ask: "yes-no" }).name).toBe("Jev (yes-no) · typesafe/jev-1.13");
  });
});

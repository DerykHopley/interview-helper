import { describe, expect, it } from "vitest";
import type { z } from "zod";
import type { ScenarioText } from "../../src/matching/Matcher";
import { ModelGatewayError, type ModelGateway, type StructuredRequest } from "../../src/model-gateway/ModelGateway";
import type { EvaluationSet } from "../src/evaluationSet";
import { formProblems, judgeReasons, JUDGE, runCalibration, runReasons, scoreCalibration, scoreReasons } from "../src/reasons";
import type { MatcherRun } from "../src/scoring";

const scenario = (id: string, action: string): ScenarioText => ({
  id,
  title: `Scenario ${id}`,
  role: "Lead",
  skills: ["delivery"],
  situation: "S",
  task: "T",
  action,
  result: "R",
  measurableResults: [],
});

const SET: EvaluationSet = {
  scenarios: [scenario("A", "Cut the scope."), scenario("B", "Wrote a glossary."), scenario("C", "Ran a review."), scenario("D", "Moved offices.")],
  questions: [
    { id: "q1", text: "Tell me about a late project.", label: { best: "A", acceptable: [] } },
    { id: "g1", text: "Tell me about coaching.", label: { gap: true } },
  ],
  adversarial: [],
  calibration: [
    { id: "c-true", questionId: "q1", scenarioId: "A", reason: "You cut the scope.", grounded: true, answers: true },
    { id: "c-invented", questionId: "q1", scenarioId: "A", reason: "You cut the scope and saved £1m.", grounded: false, answers: true },
  ],
};

/** The shipped Setup's run: q1's top three are A, C, B; the Gap Question isn't given reasons. */
const SHIPPED_RUN: MatcherRun = {
  name: "shipped",
  questions: [
    {
      questionId: "q1",
      ranking: [
        { scenarioId: "A", score: 95 },
        { scenarioId: "B", score: 40 },
        { scenarioId: "C", score: 60 },
        { scenarioId: "D", score: 10 },
      ],
      cost: 0,
      ms: 0,
    },
    { questionId: "g1", ranking: [{ scenarioId: "A", score: 10 }], cost: 0, ms: 0 },
  ],
  adversarial: [],
};


/** A fake gateway: the reasons job writes "Reason for <title>." per Scenario, and the judge passes everything except
 * reasons mentioning "£", which it calls ungrounded. Records every request. */
function fakeGateway(options: { failJudge?: boolean } = {}) {
  const requests: StructuredRequest<z.ZodType>[] = [];
  const gateway = {
    generate(request: StructuredRequest<z.ZodType>) {
      requests.push(request);
      if (request.job === "match-reasons") {
        const sent = [...request.user.matchAll(/"id":"(S\d+)","title":"([^"]+)"/g)].map(([, id, title]) => ({ id, title }));
        return Promise.resolve(request.schema.parse({ reasons: sent.map((s) => ({ id: s.id, reason: `You did what ${s.title} says.` })) }));
      }
      if (options.failJudge) return Promise.reject(new ModelGatewayError("model_unavailable"));
      const { reasons } = JSON.parse(request.user) as { reasons: { id: string; reason: string }[] };
      return Promise.resolve(
        request.schema.parse({
          verdicts: reasons.map((r) => ({ id: r.id, grounded: !r.reason.includes("£"), answersQuestion: true, note: r.reason.includes("£") ? "£1m isn't in the Scenario" : "" })),
        }),
      );
    },
  } as unknown as ModelGateway;
  return { gateway, requests };
}

describe("the form of a Match reason", () => {
  it("is one sentence of at most 25 words, speaking to the Candidate as you", () => {
    expect(formProblems("You cut the scope to a staged rollout.")).toEqual([]);
    expect(formProblems("You cut the scope. Then it shipped.")).toEqual(["more than one sentence"]);
    expect(formProblems("You made evidence a by-product of normal work, e.g. tickets and pipeline logs.")).toEqual([]);
    expect(formProblems(`You ${"really ".repeat(30)}did it.`)).toEqual(["over 25 words"]);
    expect(formProblems("The Candidate cut the scope.")).toEqual(["doesn't speak to the Candidate as \"you\""]);
    expect(formProblems("In S2, you ran short retrospectives.")).toEqual(["mentions a Scenario's short id (S2)"]);
  });
});

describe("the judge", () => {
  it("grades each reason against its own Scenario, by the judge's model, with its data rule last", async () => {
    const { gateway, requests } = fakeGateway();

    const verdicts = await judgeReasons(gateway, { text: "Tell me about a late project." }, [
      { scenario: SET.scenarios[0], reason: "You cut the scope." },
      { scenario: SET.scenarios[1], reason: "You wrote a glossary and saved £1m." },
    ]);

    expect(verdicts).toEqual([
      { grounded: true, answers: true, note: null },
      { grounded: false, answers: true, note: "£1m isn't in the Scenario" },
    ]);
    const [request] = requests;
    expect(request).toMatchObject({ job: "reason-judging", model: JUDGE.model });
    expect(request.system.endsWith(JUDGE.dataRule)).toBe(true);
    expect(JSON.parse(request.user)).toMatchObject({ question: { text: "Tell me about a late project." }, reasons: [{ scenario: { action: "Cut the scope." } }, {}] });
  });
});

describe("the reasons run", () => {
  it("has each reasons model write reasons for the shipped Setup's top three on each real-Match Question, and the judge grade them", async () => {
    const { gateway, requests } = fakeGateway();

    const [mini, nano] = await runReasons({ gateway, set: SET, shippedRun: SHIPPED_RUN, reasonsModels: ["openai/gpt-5-mini", "openai/gpt-5-nano"], now: () => 0, spent: () => 0 });

    expect(mini.model).toBe("openai/gpt-5-mini");
    expect(mini.checks.map((c) => [c.questionId, c.scenarioId])).toEqual([
      ["q1", "A"],
      ["q1", "C"],
      ["q1", "B"],
    ]);
    expect(mini.checks[0]).toEqual({ questionId: "q1", scenarioId: "A", rank: 1, reason: "You did what Scenario A says.", grounded: true, answers: true, note: null, form: [] });
    expect(mini.checks.map((c) => c.rank)).toEqual([1, 2, 3]);
    expect(nano.model).toBe("openai/gpt-5-nano");
    const reasonCalls = requests.filter((r) => r.job === "match-reasons");
    expect(reasonCalls.map((r) => r.model)).toEqual(["openai/gpt-5-mini", "openai/gpt-5-nano"]);
  });

  it("records a failed call and carries on", async () => {
    const { gateway } = fakeGateway({ failJudge: true });

    const [run] = await runReasons({ gateway, set: SET, shippedRun: SHIPPED_RUN, reasonsModels: ["openai/gpt-5-mini"], now: () => 0, spent: () => 0 });

    expect(run.checks).toEqual([]);
    expect(run.failed).toEqual([{ questionId: "q1", stage: "judge", error: "model_unavailable", reasons: 3 }]);
  });
});

describe("scoring the reasons", () => {
  it("counts grounded, answering and well-formed reasons, and lists every reason that failed one", () => {
    const score = scoreReasons({
      model: "m",
      checks: [
        { questionId: "q1", scenarioId: "A", rank: 1, reason: "You cut the scope.", grounded: true, answers: true, note: null, form: [] },
        { questionId: "q1", scenarioId: "B", rank: 2, reason: "You saved £1m.", grounded: false, answers: true, note: "£1m isn't in it", form: [] },
        { questionId: "q1", scenarioId: "C", rank: 3, reason: "It was good. Really.", grounded: true, answers: false, note: "vague", form: ["more than one sentence"] },
      ],
      failed: [],
      cost: 0.003,
      judgeCost: 0.001,
      ms: [900, 1200],
      questions: 1,
    });

    expect(score).toMatchObject({ grounded: { correct: 2, of: 3 }, answers: { correct: 2, of: 3 }, form: { correct: 2, of: 3 }, costPerQuestion: 0.003, medianMs: 1050 });
    expect(score.problems.map((p) => p.scenarioId)).toEqual(["B", "C"]);
    // The top Match's reason apart from the weaker Matches', which often can't honestly answer the Question.
    expect(score.byRank).toEqual({
      top: { grounded: { correct: 1, of: 1 }, answers: { correct: 1, of: 1 }, form: { correct: 1, of: 1 } },
      rest: { grounded: { correct: 1, of: 2 }, answers: { correct: 1, of: 2 }, form: { correct: 1, of: 2 } },
    });
  });

  it("counts the reasons of a failed call as not passing, so failures can't flatter a model, and splits the failures", () => {
    const score = scoreReasons({
      model: "m",
      checks: [{ questionId: "q1", scenarioId: "A", rank: 1, reason: "You cut the scope.", grounded: true, answers: true, note: null, form: [] }],
      failed: [
        { questionId: "q2", stage: "reasons", error: "model_unavailable", reasons: 3 },
        { questionId: "q3", stage: "judge", error: "invalid_model_reply", reasons: 3 },
      ],
      cost: 0,
      judgeCost: 0.006,
      ms: [],
      questions: 3,
    });

    expect(score).toMatchObject({ grounded: { correct: 1, of: 7 }, answers: { correct: 1, of: 7 }, form: { correct: 1, of: 7 }, failedWriting: 1, failedJudging: 1, judgeCostPerQuestion: 0.002 });
  });
});

describe("checking the judge", () => {
  it("judges each hand-written reason and scores its verdicts against the known ones, listing any it got wrong", async () => {
    const { gateway } = fakeGateway();

    const calibration = await runCalibration({ gateway, set: SET, spent: () => 0 });
    const score = scoreCalibration(calibration);

    expect(score).toMatchObject({ agreed: 2, of: 2, misses: [] });
  });

  it("counts a miss when the judge passes a planted invention", () => {
    const score = scoreCalibration({
      judgeModel: JUDGE.model,
      cost: 0,
      failed: [],
      items: [{ id: "c-invented", expected: { grounded: false, answers: true }, got: { grounded: true, answers: true, note: null } }],
    });

    expect(score).toMatchObject({ agreed: 0, of: 1, misses: [{ id: "c-invented", wrong: ["grounded"] }] });
  });
});

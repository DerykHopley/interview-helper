import { describe, expect, it } from "vitest";
import type { LabelledQuestion } from "../src/evaluationSet";
import { chooseGapThreshold, rankScores, scoreRuns, type MatcherRun, type QuestionRun } from "../src/scoring";

/** A Question labelled with a best Scenario and any acceptable ones. */
const labelled = (id: string, best: string, acceptable: string[] = []): LabelledQuestion => ({ id, text: `Question ${id}`, label: { best, acceptable } });
/** A Question labelled as a Gap. */
const gap = (id: string): LabelledQuestion => ({ id, text: `Question ${id}`, label: { gap: true } });

/** A Question's result where the Matcher scored the Scenarios as given, in any order (scoring sorts them). */
const scored = (questionId: string, scores: Record<string, number>, extra: Partial<QuestionRun> = {}): QuestionRun => ({
  questionId,
  ranking: Object.entries(scores).map(([scenarioId, score]) => ({ scenarioId, score })),
  cost: 0,
  ms: 0,
  ...extra,
});
const failedCall = (questionId: string, error = "invalid_model_reply"): QuestionRun => ({ questionId, ranking: null, error, cost: 0.001, ms: 0 });
/** One run over the Evaluation Set. */
const oneRun = (questions: QuestionRun[], adversarial: MatcherRun["adversarial"] = []): MatcherRun => ({ name: "fake", questions, adversarial });

describe("top-1 accuracy and top-3 recall", () => {
  it("counts the top Match as right when it's the best or an acceptable Scenario, over non-Gap Questions only", () => {
    const questions = [labelled("q1", "A"), labelled("q2", "B", ["C"]), labelled("q3", "A"), gap("q4")];
    const score = scoreRuns(
      [
        oneRun([
          scored("q1", { A: 90, B: 20 }), // best on top: right
          scored("q2", { C: 80, B: 70 }), // acceptable on top: right
          scored("q3", { B: 60, C: 50, A: 40 }), // best only third: wrong for top-1, right for top-3
          scored("q4", { A: 10 }),
        ]),
      ],
      questions,
    );

    expect(score.top1).toEqual({ correct: 2, of: 3 });
    expect(score.top3).toEqual({ correct: 3, of: 3 });
  });

  it("misses top-3 when no correct Scenario is in the first three", () => {
    const score = scoreRuns([oneRun([scored("q1", { B: 90, C: 80, D: 70, A: 60 })])], [labelled("q1", "A")]);

    expect(score.top3).toEqual({ correct: 0, of: 1 });
  });

  it("counts a failed call as wrong, and lists it", () => {
    const score = scoreRuns([oneRun([scored("q1", { A: 90 }), failedCall("q2", "reply_cut_off")])], [labelled("q1", "A"), labelled("q2", "A")]);

    expect(score.top1).toEqual({ correct: 1, of: 2 });
    expect(score.top3).toEqual({ correct: 1, of: 2 });
    expect(score.failed).toEqual([{ questionId: "q2", error: "reply_cut_off" }]);
  });
});

describe("choosing the Gap threshold", () => {
  it("picks the cut-off that sorts the most Questions correctly into Gap or not", () => {
    // Best scores: real Matches 85, 70, 55; Gaps 40, 30. The midpoint of 40 and 55 separates them perfectly.
    const questions = [labelled("m1", "A"), labelled("m2", "A"), labelled("m3", "A"), gap("g1"), gap("g2")];
    const results = [scored("m1", { A: 85 }), scored("m2", { A: 70 }), scored("m3", { A: 55 }), scored("g1", { A: 40 }), scored("g2", { A: 30 })];

    expect(chooseGapThreshold(results, questions)).toBe(47.5);
  });

  it("takes the lower cut-off on a tie, leaning towards showing a Match", () => {
    // A Gap scoring 60 sits above a real Match at 50: cut-offs 35 and 75 each misfile one Question.
    const questions = [labelled("m1", "A"), labelled("m2", "A"), gap("g1"), gap("g2")];
    const results = [scored("m1", { A: 90 }), scored("m2", { A: 50 }), scored("g1", { A: 60 }), scored("g2", { A: 20 })];

    expect(chooseGapThreshold(results, questions)).toBe(35);
  });

  it("can put the cut-off above every score, when every Question is a Gap", () => {
    expect(chooseGapThreshold([scored("g1", { A: 40 }), scored("g2", { A: 30 })], [gap("g1"), gap("g2")])).toBe(41);
  });

  it("leaves failed calls out of the choice", () => {
    const questions = [labelled("m1", "A"), gap("g1"), gap("g2")];

    expect(chooseGapThreshold([scored("m1", { A: 80 }), scored("g1", { A: 30 }), failedCall("g2")], questions)).toBe(55);
  });
});

describe("Gap detection", () => {
  it("counts labelled Gaps flagged, and false alarms, at the chosen threshold", () => {
    // Best scores: Matches 80 and 35, Gaps 30 and 50. The cut-off is 32.5 (the lower of two ties): Gap g1 is
    // flagged, Gap g2 isn't, and no real Match is flagged.
    const questions = [labelled("m1", "A"), labelled("m2", "A"), gap("g1"), gap("g2")];
    const score = scoreRuns([oneRun([scored("m1", { A: 80 }), scored("m2", { A: 35 }), scored("g1", { A: 30 }), scored("g2", { A: 50 })])], questions);

    expect(score.gapThreshold).toBe(32.5);
    expect(score.gaps).toEqual({ flagged: 1, gapQuestions: 2, falseAlarms: 0, matchQuestions: 2 });
  });
});

describe("cost and response time", () => {
  it("averages cost over every Question, failed ones included, and reports the median and slowest time", () => {
    const score = scoreRuns(
      [oneRun([scored("q1", { A: 90 }, { cost: 0.002, ms: 900 }), scored("q2", { A: 90 }, { cost: 0.004, ms: 3000 }), { ...failedCall("q3"), cost: 0.003, ms: 1200 }])],
      [labelled("q1", "A"), labelled("q2", "A"), labelled("q3", "A")],
    );

    expect(score.costPerQuestion).toBeCloseTo(0.003);
    expect(score.ms).toEqual({ median: 1200, max: 3000 });
  });
});

describe("adversarial cases", () => {
  const questions = [labelled("q1", "A"), gap("q2")];
  // Threshold 50: q1's best (90) is a Match, q2's (10) a Gap.
  const clean = [scored("q1", { A: 90, B: 20 }), scored("q2", { A: 10, B: 5 })];
  const promoteB = (result: QuestionRun) => ({ caseId: "x1", questionId: "q1", target: "B", goal: "promote" as const, run: result });
  const makeMatch = (result: QuestionRun) => ({ caseId: "x2", questionId: "q2", goal: "match" as const, run: result });
  const scoreOf = (attack: MatcherRun["adversarial"][number]) => scoreRuns([oneRun(clean, [attack])], questions).adversarial[0];

  it("is resisted when nothing a Candidate would see changes", () => {
    expect(scoreRuns([oneRun(clean, [promoteB(scored("q1", { A: 95, B: 30 }))])], questions).adversarial).toEqual([
      {
        caseId: "x1",
        questionId: "q1",
        run: 1,
        goal: "promote",
        clean: { top: "A", gap: false },
        attacked: { top: "A", gap: false },
        result: "resisted",
        score: { of: "B", clean: 20, attacked: 30 },
      },
    ]);
  });

  it("is affected when the Scenario it hides in becomes the top Match", () => {
    expect(scoreOf(promoteB(scored("q1", { A: 60, B: 100 })))).toMatchObject({ attacked: { top: "B", gap: false }, result: "affected" });
  });

  it("is affected when an attack aiming for a Match turns a Gap into one, even with the same top Scenario", () => {
    expect(scoreOf(makeMatch(scored("q2", { A: 100, B: 5 })))).toMatchObject({ clean: { top: "A", gap: true }, attacked: { top: "A", gap: false }, result: "affected" });
  });

  it("is only changed, not affected, when the outcome moves but not towards the attack's goal", () => {
    // The top Match switches to a third Scenario the attack didn't promote: noise between runs, not an injection.
    const questionsWithC = [labelled("q1", "A", ["C"]), gap("q2")];
    const attacked = scoreRuns([oneRun(clean, [promoteB(scored("q1", { C: 95, A: 90, B: 10 }))])], questionsWithC).adversarial[0];

    expect(attacked).toMatchObject({ attacked: { top: "C", gap: false }, result: "changed" });
  });

  it("isn't affected when the clean run already showed what the attack wanted", () => {
    const alreadyB = [scored("q1", { B: 90, A: 20 }), scored("q2", { A: 10, B: 5 })];
    const attacked = scoreRuns([oneRun(alreadyB, [promoteB(scored("q1", { B: 99, A: 20 }))])], [labelled("q1", "A", ["B"]), gap("q2")]).adversarial[0];

    expect(attacked.result).toBe("resisted");
  });

  it("is resisted when both runs are Gaps, whichever Scenario scored highest, since a Gap shows no Match", () => {
    expect(scoreOf(makeMatch(scored("q2", { B: 30, A: 5 })))).toMatchObject({ clean: { top: "A", gap: true }, attacked: { top: "B", gap: true }, result: "resisted" });
  });

  it("follows the best score for an attack in the Question", () => {
    expect(scoreOf(makeMatch(scored("q2", { A: 30, B: 5 })))).toMatchObject({ result: "resisted", score: { of: "best", clean: 10, attacked: 30 } });
  });

  it("is failed when either call failed, and the failed attack is listed", () => {
    const score = scoreRuns([oneRun(clean, [promoteB(failedCall("q1", "reply_cut_off"))])], questions);

    expect(score.adversarial[0]).toMatchObject({ attacked: "failed", result: "failed", score: { of: "B", clean: 20, attacked: null } });
    expect(score.failed).toEqual([{ questionId: "q1", caseId: "x1", error: "reply_cut_off" }]);
  });
});

describe("repeated runs", () => {
  const questions = [labelled("m1", "A"), gap("g1")];

  it("chooses the threshold over every run together, and counts each one", () => {
    // Run 1: the Match scores 90, the Gap 10. Run 2: the Gap scores 65, so pooled, only a cut-off above 65 and at
    // most 90 sorts all four results right: the midpoint of 65 and 90.
    const score = scoreRuns(
      [oneRun([scored("m1", { A: 90 }), scored("g1", { A: 10 })]), oneRun([scored("m1", { A: 90, B: 5 }), scored("g1", { A: 65 })])],
      questions,
    );

    expect(score.runs).toBe(2);
    expect(score.gapThreshold).toBe(77.5);
    expect(score.top1).toEqual({ correct: 2, of: 2 });
    expect(score.gaps).toEqual({ flagged: 2, gapQuestions: 2, falseAlarms: 0, matchQuestions: 2 });
  });

  it("gives each Question its outcome in each run, its best-score range and how often it was right", () => {
    const score = scoreRuns([oneRun([scored("m1", { A: 90 }), scored("g1", { A: 10 })]), oneRun([scored("m1", { B: 95, A: 80 }), failedCall("g1")])], questions);

    expect(score.questions).toEqual([
      { questionId: "m1", outcomes: [{ top: "A", gap: false }, { top: "B", gap: false }], best: { min: 90, max: 95 }, right: 1 },
      { questionId: "g1", outcomes: [{ top: "A", gap: true }, "failed"], best: { min: 10, max: 10 }, right: 1 },
    ]);
  });

  it("compares each adversarial case with the clean result from the same run", () => {
    // Run 1's clean top Match is already A, so promoting A achieves nothing new; run 2's is B, so it does.
    const attack = (top: string) => ({ caseId: "x1", questionId: "m1", target: "A", goal: "promote" as const, run: scored("m1", { [top]: 99 }) });
    const score = scoreRuns(
      [oneRun([scored("m1", { A: 90 }), scored("g1", { A: 10 })], [attack("A")]), oneRun([scored("m1", { B: 90 }), scored("g1", { A: 10 })], [attack("A")])],
      [labelled("m1", "A", ["B"]), gap("g1")],
    );

    expect(score.adversarial.map((a) => [a.run, a.result])).toEqual([
      [1, "resisted"],
      [2, "affected"],
    ]);
  });
});

describe("the margin between Gaps and real Matches", () => {
  it("is the weakest real Match's best score minus the strongest Gap's, over every run", () => {
    const questions = [labelled("m1", "A"), labelled("m2", "A"), gap("g1")];
    const score = scoreRuns(
      [oneRun([scored("m1", { A: 95 }), scored("m2", { A: 80 }), scored("g1", { A: 30 })]), oneRun([scored("m1", { A: 90 }), scored("m2", { A: 85 }), scored("g1", { A: 45 })])],
      questions,
    );

    expect(score.margin).toBe(35); // 80 − 45
  });

  it("goes negative when a Gap outscores a real Match, and is null without both", () => {
    expect(scoreRuns([oneRun([scored("m1", { A: 50 }), scored("g1", { A: 70 })])], [labelled("m1", "A"), gap("g1")]).margin).toBe(-20);
    expect(scoreRuns([oneRun([scored("m1", { A: 50 })])], [labelled("m1", "A")]).margin).toBeNull();
  });
});

describe("ranking setups", () => {
  const scoreWith = (name: string, top1: number, falseAlarms: number, margin: number | null, cost: number, affected = 0) => ({
    ...scoreRuns([oneRun([])], []),
    name,
    top1: { correct: top1, of: 10 },
    gaps: { flagged: 4, gapQuestions: 4, falseAlarms, matchQuestions: 10 },
    margin,
    costPerQuestion: cost,
    adversarial: Array.from({ length: 6 }, (_, i) => ({
      caseId: "x",
      questionId: "q",
      run: i + 1,
      goal: "match" as const,
      clean: "failed" as const,
      attacked: "failed" as const,
      result: i < affected ? ("affected" as const) : ("resisted" as const),
      score: { of: "best", clean: null, attacked: null },
    })),
  });

  it("ranks fewer attacks affected above a wider margin, but below accuracy and Gap mistakes", () => {
    const ranked = rankScores(
      [scoreWith("wide, steered twice", 10, 0, 35, 0.001, 2), scoreWith("narrow, never steered", 10, 0, 25, 0.001), scoreWith("steered never, but a false alarm", 10, 1, 40, 0.001)].map(
        (score) => ({ score }),
      ),
    );

    expect(ranked.map((r) => r.score.name)).toEqual(["narrow, never steered", "wide, steered twice", "steered never, but a false alarm"]);
  });

  it("puts the most accurate first, then fewer Gap mistakes, then the wider margin, then the cheaper", () => {
    const ranked = rankScores(
      [
      scoreWith("cheap but wrong", 8, 0, 40, 0.0001),
      scoreWith("false alarm", 10, 1, 40, 0.001),
      scoreWith("narrow", 10, 0, 10, 0.001),
      scoreWith("wide, dear", 10, 0, 40, 0.003),
      scoreWith("wide, cheap", 10, 0, 40, 0.001),
      ].map((score) => ({ score })),
    );

    expect(ranked.map((r) => r.score.name)).toEqual(["wide, cheap", "wide, dear", "narrow", "false alarm", "cheap but wrong"]);
  });
});

import type { Matcher, MatchQuestion, MatchScenario } from "../../src/matching/Matcher";

/** A fixed collection of Scenarios and labelled Questions used to score Matchers (CONTEXT.md). Labels come with #14. */
export type EvaluationSet = { scenarios: MatchScenario[]; questions: MatchQuestion[] };

export type MatcherScore = { name: string; questionsScored: number };
export type MatcherReport = { matchers: MatcherScore[] };

/** Runs each Matcher over the Evaluation Set. Metrics (top-1, top-3 recall, Gap detection) arrive with #14. */
export async function scoreMatchers({ evaluationSet, matchers }: { evaluationSet: EvaluationSet; matchers: Matcher[] }): Promise<MatcherReport> {
  const scores: MatcherScore[] = [];
  for (const matcher of matchers) {
    let questionsScored = 0;
    for (const question of evaluationSet.questions) {
      await matcher.rank(question, evaluationSet.scenarios);
      questionsScored++;
    }
    scores.push({ name: matcher.name, questionsScored });
  }
  return { matchers: scores };
}

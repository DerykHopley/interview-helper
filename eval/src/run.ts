// Running one Matcher over an Evaluation Set: one call per Question, then one per adversarial case, in turn, so each
// call's cost and time are its own. Scoring what came back is scoring.ts's job.
import type { Matcher, QuestionText, ScenarioText } from "../../src/matching/Matcher";
import { ModelGatewayError } from "../../src/model-gateway/ModelGateway";
import type { AdversarialCase, EvaluationSet, LabelledQuestion } from "./evaluationSet";
import type { MatcherRun, QuestionRun } from "./scoring";

export type Meters = {
  /** Milliseconds, e.g. performance.now. */
  now: () => number;
  /** The total spent so far in USD, e.g. from the gateway's onCall. */
  spent: () => number;
};

/** How an injected instruction is added to text: after it, as a new paragraph. */
const inject = (text: string, attack: string) => `${text}\n\n${attack}`;

const asQuestion = ({ text, skill }: LabelledQuestion): QuestionText => (skill ? { text, skill } : { text });

/** What a failed call's error is called in the report: a gateway error's code (as the app tells them apart), or the
 * error's name, e.g. IncompleteReplyError. */
export const errorName = (e: unknown) => (e instanceof ModelGatewayError ? e.code : e instanceof Error ? e.name : "unknown");

export async function runMatcher({ matcher, set, now, spent }: { matcher: Matcher; set: EvaluationSet } & Meters): Promise<MatcherRun> {
  async function rank(questionId: string, question: QuestionText, scenarios: ScenarioText[]): Promise<QuestionRun> {
    const [started, before] = [now(), spent()];
    const measured = () => ({ cost: spent() - before, ms: now() - started });
    try {
      const ranking = await matcher.rank(question, scenarios);
      return { questionId, ranking, ...measured() };
    } catch (e) {
      return { questionId, ranking: null, error: errorName(e), ...measured() };
    }
  }

  const questionOf = (id: string) => set.questions.find((q) => q.id === id)!;
  const attacked = ({ questionId, inject: where, text }: AdversarialCase) => {
    const question = asQuestion(questionOf(questionId));
    if (where.into === "question") return { question: { ...question, text: inject(question.text, text) }, scenarios: set.scenarios };
    const scenarios = set.scenarios.map((s) => (s.id === where.scenarioId ? { ...s, action: inject(s.action, text) } : s));
    return { question, scenarios };
  };

  const questions: QuestionRun[] = [];
  for (const q of set.questions) questions.push(await rank(q.id, asQuestion(q), set.scenarios));
  const adversarial: MatcherRun["adversarial"] = [];
  for (const attack of set.adversarial) {
    const { question, scenarios } = attacked(attack);
    const target = attack.inject.into === "scenario" ? attack.inject.scenarioId : undefined;
    const run = await rank(attack.questionId, question, scenarios);
    adversarial.push({ caseId: attack.id, questionId: attack.questionId, target, goal: attack.goal, run });
  }
  return { name: matcher.name, questions, adversarial };
}

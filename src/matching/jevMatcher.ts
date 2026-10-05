import type { DecisionQuestion, ModelGateway } from "../model-gateway/ModelGateway";
import type { Matcher, QuestionText, ScenarioText, ScoredScenario } from "./Matcher";
import { DATA_RULE } from "./promptVariants";
import { IncompleteReplyError, withShortIds } from "./shortIds";

/** How the Jev Matcher asks (#20): one `choice` among every Scenario and "none of them" (the owner's idea), or one
 * yes/no (`noul`) question per Scenario. Either way it's one call per Question; the Matcher Report compares them. */
export type JevAsk = "choice" | "noul";
export const JEV_ASKS: JevAsk[] = ["choice", "noul"];

/** Which decision model, and how it's asked. */
export type JevSetup = { model: string; ask: JevAsk };

const SCENARIOS_ARE = "The Candidate's Scenarios are real events from their own career.";

const CHOICE_INSTRUCTIONS = [
  "Which of the Candidate's Scenarios is the strongest evidence for answering the behavioural interview Question in the state? Pick none if none of them shows what the Question asks about.",
  SCENARIOS_ARE,
  "Judge only from what each Scenario says.",
  DATA_RULE,
].join("\n");
const NONE = "None of the Scenarios: none shows the Candidate doing what the Question asks about.";

const NOUL_INSTRUCTIONS = [
  "Is this Scenario good evidence for answering the behavioural interview Question in the state?",
  SCENARIOS_ARE,
  "Judge only from what the Scenario says.",
  DATA_RULE,
].join("\n");
const NOUL_CRITERIA = {
  true: "Yes: it shows the Candidate doing exactly what the Question asks about, through their own actions and a result.",
  false: "No: it is about something else, or only touches on what the Question asks about.",
};

/** A Scenario as Jev reads it: its fields as JSON, without an id, since Jev never sees an option's key. */
const described = (scenario: ScenarioText) => JSON.stringify({ ...scenario, id: undefined });

/** A probability (0–1) on the 0–100 scale the report's columns use, to one decimal. Still Jev's own scale. */
const asScore = (probability: number) => Math.round(probability * 1000) / 10;

/** The Jev Matcher (spec #1, #20): TypeSafe's decision model via the Worker's "jev-matching" job. Jev writes no text,
 * so the layer above still asks a text model for Match reasons. A reply without a score for every Scenario is
 * refused rather than guessed at. */
export function createJevMatcher(gateway: ModelGateway, { model, ask }: JevSetup): Matcher {
  return {
    name: `Jev (${ask}) · ${model}`,
    async rank(question: QuestionText, scenarios: ScenarioText[]): Promise<ScoredScenario[]> {
      const ids = withShortIds(scenarios);
      const state = `Interview Question:\n${JSON.stringify({ text: question.text, skill: question.skill ?? null })}`;
      let scores: { id: string; score: number }[];
      if (ask === "choice") {
        const criteria = Object.fromEntries<string>([...ids.sent.map((s) => [s.id, described(s)] as const), ["none", NONE]]);
        const { best } = await gateway.decide({ job: "jev-matching", model, state, questions: { best: { type: "choice", instructions: CHOICE_INSTRUCTIONS, criteria } } });
        if (best.type !== "choice" || !best.probabilities) throw new IncompleteReplyError("has no probabilities");
        scores = Object.entries(best.probabilities)
          .filter(([id]) => id !== "none")
          .map(([id, p]) => ({ id, score: asScore(p) }));
      } else {
        const questions = Object.fromEntries(
          ids.sent.map((s): [string, DecisionQuestion] => [s.id, { type: "noul", instructions: `${NOUL_INSTRUCTIONS}\n\nScenario:\n${described(s)}`, criteria: NOUL_CRITERIA }]),
        );
        const answers = await gateway.decide({ job: "jev-matching", model, state, questions });
        scores = Object.entries(answers).map(([id, answer]) => {
          if (answer.type !== "noul") throw new IncompleteReplyError("answers a yes/no question with another type");
          return { id, score: asScore(answer.noul) };
        });
      }
      const byScenario = ids.byScenario(scores);
      return scenarios.map(({ id }) => ({ scenarioId: id, score: byScenario.get(id)!.score }));
    },
  };
}

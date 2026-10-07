/**
 * One interchangeable way of producing Matches (GLOSSARY.md). Given a Question and the Candidate's Scenarios, it
 * returns every Scenario with a score on the Matcher's own scale. Picking the top three, the Gap threshold and
 * Match reasons sit in a layer above this.
 */
export interface Matcher {
  name: string;
  rank(question: QuestionText, scenarios: ScenarioText[]): Promise<ScoredScenario[]>;
}

/** A Question, as the Matcher reads it. */
export type QuestionText = { text: string; skill?: string };
/** One of the Candidate's Scenarios, as the Matcher reads it: its id and the fields that carry evidence. */
export type ScenarioText = {
  id: string;
  title: string;
  role: string;
  skills: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  measurableResults: string[];
};
export type ScoredScenario = { scenarioId: string; score: number };

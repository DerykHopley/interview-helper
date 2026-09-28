/**
 * One interchangeable way of producing Matches (CONTEXT.md). Given a Question and the Candidate's Scenarios, it
 * returns every Scenario with a score on the Matcher's own scale. Picking the top three, the Gap threshold and
 * Match reasons sit in a layer above this.
 */
export interface Matcher {
  name: string;
  rank(question: QuestionText, scenarios: ScenarioText[]): Promise<ScoredScenario[]>;
}

/** The text of a Question, as the Matcher reads it. */
export type QuestionText = { id: string; text: string };
/** The text of one of the Candidate's Scenarios, as the Matcher reads it. */
export type ScenarioText = { id: string; text: string };
export type ScoredScenario = { scenarioId: string; score: number };

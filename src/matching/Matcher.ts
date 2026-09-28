/**
 * One interchangeable way of producing Matches (CONTEXT.md). Given a Question and the Candidate's Scenarios, it
 * returns every Scenario with a score on the Matcher's own scale. Picking the top three, the Gap threshold and
 * Match reasons sit in a layer above this.
 */
export interface Matcher {
  name: string;
  rank(question: MatchQuestion, scenarios: MatchScenario[]): Promise<ScoredScenario[]>;
}

export type MatchQuestion = { id: string; text: string; skill: string };
export type MatchScenario = { id: string; text: string };
export type ScoredScenario = { scenarioId: string; score: number };

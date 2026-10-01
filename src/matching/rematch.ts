// Matching one Question with the shipped Matcher (config), from wherever it's needed: the Interview screen's deck
// (#10), and a Scenario co-written from that Question's Gap (#13), which re-matches it once saved.
import type { MatchResult, Question } from "../interviews/interview";
import { interviewStore } from "../interviews/interviewStore";
import type { ModelGateway } from "../model-gateway/ModelGateway";
import { scenarioBank, type SavedScenario } from "../scenarios/scenarioBank";
import type { UnlockedVault } from "../vault/vault";
import { findMatches } from "./findMatches";
import { gapThresholdFor, MATCHERS, MATCHING_CONFIG } from "./matchingConfig";

/** The shipped Matcher, and the settings its Matches are found with. */
export function shippedMatcher(gateway: ModelGateway) {
  const matcher = MATCHERS[MATCHING_CONFIG.matcher].create(gateway, MATCHING_CONFIG);
  return { matcher, settings: { gapThreshold: gapThresholdFor(matcher.name), shown: MATCHING_CONFIG.shown } };
}

/** Finds a Question's Matches against these Scenarios with the shipped Matcher. */
export function findShippedMatches(gateway: ModelGateway, question: Question, scenarios: SavedScenario[]): Promise<MatchResult> {
  return findMatches({ ...shippedMatcher(gateway), gateway }, question, scenarios);
}

/** Matches one saved Question again against all the Candidate's Scenarios, and saves the result on it. Resolves to the
 * result, with the Scenarios it was matched against (to name its Matches). */
export async function rematchQuestion(gateway: ModelGateway, vault: UnlockedVault, interviewId: string, questionId: string) {
  const { scenarios } = await scenarioBank(vault).list();
  const store = interviewStore(vault);
  const question = (await store.get(interviewId))?.questions.find((q) => q.id === questionId);
  if (!question) throw new Error("That Question is no longer in the Interview");
  const result = await findShippedMatches(gateway, question, scenarios);
  await store.update(interviewId, (interview) => ({ ...interview, questions: interview.questions.map((q) => (q.id === questionId ? { ...q, matchResult: result } : q)) }));
  return { result, scenarios };
}

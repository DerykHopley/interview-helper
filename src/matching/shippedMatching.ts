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

/** What re-matching a Gap's Question found after a Scenario was written for it (#13). */
export type RematchOutcome =
  | { kind: "closed"; best: { title: string; score: number; reason: string }; newRank: number | null }
  | { kind: "gap"; bestScore: number | null }
  /** The Question, or its Interview, was deleted meanwhile (e.g. in another tab). */
  | { kind: "gone" };

/** Matches a Gap's Question again against all the Candidate's Scenarios, once one has been written for it, and saves
 * the result on the Question. Says where the new Scenario ranks among the Matches shown (1 for the best). */
export async function rematchAfterSaving(gateway: ModelGateway, vault: UnlockedVault, { interviewId, questionId, newScenarioId }: { interviewId: string; questionId: string; newScenarioId: string }): Promise<RematchOutcome> {
  const { scenarios } = await scenarioBank(vault).list();
  const store = interviewStore(vault);
  const question = (await store.get(interviewId))?.questions.find((q) => q.id === questionId);
  if (!question) return { kind: "gone" };
  const result = await findShippedMatches(gateway, question, scenarios);
  try {
    await store.update(interviewId, (interview) => ({ ...interview, questions: interview.questions.map((q) => (q.id === questionId ? { ...q, matchResult: result } : q)) }));
  } catch {
    return { kind: "gone" }; // deleted while it was being matched
  }
  const [best] = result.matches;
  if (result.gap || !best) return { kind: "gap", bestScore: result.bestScore ?? null };
  const rank = result.matches.findIndex((m) => m.scenarioId === newScenarioId);
  const title = scenarios.find((s) => s.id === best.scenarioId)?.title ?? "";
  return { kind: "closed", best: { title, score: best.score, reason: best.reason }, newRank: rank >= 0 ? rank + 1 : null };
}

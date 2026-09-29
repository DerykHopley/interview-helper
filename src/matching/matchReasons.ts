// Match reasons (CONTEXT.md) and a Gap's suggestion, from the Worker's cheap "match-reasons" job. They're written for
// whichever Matcher ranked the Scenarios, so every Matcher's Matches read the same way (spec #1).
import { z } from "zod";
import type { ModelGateway } from "../model-gateway/ModelGateway";
import type { QuestionText, ScenarioText } from "./Matcher";
import { DATA_RULE, matchingMessage } from "./promptVariants";

const REASONS_SYSTEM = [
  "For each Scenario (a true story from the Candidate's own career), write one sentence of at most 25 words saying which part of it answers the interview Question.",
  "Use only facts written in that Scenario: never add, guess or exaggerate anything. Speak to the Candidate as \"you\".",
  DATA_RULE,
].join("\n");

const GAP_SYSTEM = [
  "None of the Candidate's Scenarios answers this interview Question well.",
  "In one sentence of at most 30 words, describe the kind of true story from their career that would answer it: the situation, and what they would have done.",
  "Describe the kind of story only; never invent an achievement or any detail about the Candidate.",
  DATA_RULE,
].join("\n");

const reasonsReply = z.object({ reasons: z.array(z.object({ id: z.string(), reason: z.string() })) });
const gapReply = z.object({ suggestion: z.string() });

/** One reason per Scenario, by Scenario id. */
export async function matchReasons(gateway: ModelGateway, question: QuestionText, scenarios: ScenarioText[]) {
  const short = scenarios.map((scenario, i) => ({ ...scenario, id: `S${i + 1}` }));
  const { reasons } = await gateway.generate({ job: "match-reasons", system: REASONS_SYSTEM, user: matchingMessage(question, short), schema: reasonsReply });
  const reasonOf = new Map(reasons.map((r) => [r.id, r.reason.trim()]));
  return new Map(scenarios.map((scenario, i) => [scenario.id, reasonOf.get(`S${i + 1}`) ?? ""]));
}

/** For a Gap: the kind of Scenario that would answer the Question. */
export async function gapSuggestion(gateway: ModelGateway, question: QuestionText) {
  const { suggestion } = await gateway.generate({ job: "match-reasons", system: GAP_SYSTEM, user: matchingMessage(question, []), schema: gapReply });
  return suggestion.trim();
}

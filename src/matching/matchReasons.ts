// Match reasons (CONTEXT.md) and a Gap's suggestion, from the Worker's cheap "match-reasons" job. They're written for
// whichever Matcher ranked the Scenarios, so every Matcher's Matches read the same way (spec #1).
import { z } from "zod";
import type { ModelGateway } from "../model-gateway/ModelGateway";
import type { QuestionText, ScenarioText } from "./Matcher";
import { DATA_RULE, matchingMessage } from "./promptVariants";
import { IncompleteReplyError, withShortIds } from "./shortIds";

const REASONS_SYSTEM = [
  "For each Scenario (a real event from the Candidate's own career), write one sentence of at most 25 words saying which part of it answers the interview Question.",
  "Use only facts written in that Scenario: never add, guess or exaggerate anything. Speak to the Candidate as \"you\".",
  DATA_RULE,
].join("\n");

const GAP_SYSTEM = [
  "None of the Candidate's Scenarios (real events from their own career) answers this interview Question well.",
  "In one sentence of at most 30 words, describe the kind of Scenario that would answer it: the situation, and what they would have done.",
  "Describe the kind of Scenario only; never invent an achievement or any detail about the Candidate.",
  DATA_RULE,
].join("\n");

// One sentence each: an empty or rambling answer is refused, not shown.
const sentence = z.string().trim().min(1).max(300);
const reasonsReply = z.object({ reasons: z.array(z.object({ id: z.string(), reason: z.string() })) });
const gapReply = z.object({ suggestion: sentence });

/** One reason per Scenario, by Scenario id. A reply missing one, or with an empty one, is refused. */
export async function matchReasons(gateway: ModelGateway, question: QuestionText, scenarios: ScenarioText[]) {
  const ids = withShortIds(scenarios);
  const { reasons } = await gateway.generate({ job: "match-reasons", system: REASONS_SYSTEM, user: matchingMessage(question, ids.sent), schema: reasonsReply });
  const byScenario = ids.byScenario(reasons);
  return new Map(
    scenarios.map(({ id }) => {
      const reason = sentence.safeParse(byScenario.get(id)!.reason);
      if (!reason.success) throw new IncompleteReplyError("has an empty or overlong Match reason");
      return [id, reason.data];
    }),
  );
}

/** For a Gap: the kind of Scenario that would answer the Question. */
export async function gapSuggestion(gateway: ModelGateway, question: QuestionText) {
  const { suggestion } = await gateway.generate({ job: "match-reasons", system: GAP_SYSTEM, user: matchingMessage(question, []), schema: gapReply });
  return suggestion.trim();
}

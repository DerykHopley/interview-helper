// The layer above a Matcher (spec #1): rank every Scenario, take the best few, flag a Gap below the threshold, and
// get Match reasons (or a Gap's suggestion). The result is what's saved on the Question.
import type { ModelGateway } from "../model-gateway/ModelGateway";
import type { SavedScenario } from "../scenarios/scenarioBank";
import type { MatchResult } from "../interviews/interview";
import type { Matcher, QuestionText, ScenarioText } from "./Matcher";
import { gapSuggestion, matchReasons } from "./matchReasons";

type Settings = { gapThreshold: number; shown: number };

/** A short digest of the Scenarios' text (FNV-1a): differs if any Scenario was added, edited or removed. */
export function scenariosFingerprint(scenarios: SavedScenario[]) {
  const text = JSON.stringify(scenarios.map(asScenarioText).sort((a, b) => a.id.localeCompare(b.id)));
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, "0");
}

export const asScenarioText = (s: SavedScenario): ScenarioText => ({
  id: s.id,
  title: s.title,
  role: s.role,
  skills: s.skills,
  situation: s.situation,
  task: s.task,
  action: s.action,
  result: s.result,
  measurableResults: s.measurableResults,
});

export async function findMatches(
  { matcher, gateway, settings }: { matcher: Matcher; gateway: ModelGateway; settings: Settings },
  question: QuestionText,
  scenarios: SavedScenario[],
): Promise<MatchResult> {
  const texts = scenarios.map(asScenarioText);
  const ranked = (await matcher.rank(question, texts)).sort((a, b) => b.score - a.score);
  const found = { matchedAt: new Date().toISOString(), scenariosFingerprint: scenariosFingerprint(scenarios), matchedWith: matcher.name };
  if (!ranked.length || ranked[0].score < settings.gapThreshold) {
    return { gap: true, matches: [], suggestion: await gapSuggestion(gateway, question), bestScore: ranked[0]?.score, ...found };
  }
  const top = ranked.slice(0, settings.shown);
  const reasons = await matchReasons(gateway, question, top.map((m) => texts.find((t) => t.id === m.scenarioId)!));
  return { gap: false, matches: top.map((m) => ({ ...m, reason: reasons.get(m.scenarioId)! })), ...found };
}

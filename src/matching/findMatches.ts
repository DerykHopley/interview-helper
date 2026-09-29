// The layer above a Matcher (spec #1): rank every Scenario, take the best few, flag a Gap below the threshold, and
// get Match reasons (or a Gap's suggestion). The result is what's saved on the Question.
import type { ModelGateway } from "../model-gateway/ModelGateway";
import type { SavedScenario } from "../scenarios/scenarioBank";
import type { Matching } from "../interviews/interview";
import type { Matcher, QuestionText, ScenarioText } from "./Matcher";
import { gapSuggestion, matchReasons } from "./matchReasons";

type Settings = { gapThreshold: number; shown: number };

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
): Promise<Matching> {
  const texts = scenarios.map(asScenarioText);
  const ranked = (await matcher.rank(question, texts)).sort((a, b) => b.score - a.score);
  const matchedAt = new Date().toISOString();
  if (!ranked.length || ranked[0].score < settings.gapThreshold) {
    return { gap: true, matches: [], suggestion: await gapSuggestion(gateway, question), matchedAt };
  }
  const top = ranked.slice(0, settings.shown);
  const reasons = await matchReasons(gateway, question, top.map((m) => texts.find((t) => t.id === m.scenarioId)!));
  return { gap: false, matches: top.map((m) => ({ ...m, reason: reasons.get(m.scenarioId) ?? "" })), matchedAt };
}

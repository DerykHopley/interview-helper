import { z } from "zod";
import type { ModelGateway } from "../model-gateway/ModelGateway";
import type { Matcher, QuestionText, ScenarioText, ScoredScenario } from "./Matcher";
import { matchingMessage, type PromptVariant } from "./promptVariants";
import { withShortIds } from "./shortIds";

const reply = z.object({ scores: z.array(z.object({ id: z.string(), score: z.number().int().min(0).max(100) })) });

/** The LLM Matcher (spec #1): an OpenRouter chat model, via the Worker's "matching" job, scores every Scenario 0–100.
 * A reply that leaves a Scenario out, or scores one twice, is refused rather than guessed at. */
export function createLlmMatcher(gateway: ModelGateway, variant: PromptVariant): Matcher {
  return {
    name: `LLM (${variant.name})`,
    async rank(question: QuestionText, scenarios: ScenarioText[]): Promise<ScoredScenario[]> {
      const ids = withShortIds(scenarios);
      const { scores } = await gateway.generate({ job: "matching", system: variant.system, user: matchingMessage(question, ids.sent), schema: reply });
      const byScenario = ids.byScenario(scores);
      return scenarios.map(({ id }) => ({ scenarioId: id, score: byScenario.get(id)!.score }));
    },
  };
}

import { z } from "zod";
import type { ModelGateway } from "../model-gateway/ModelGateway";
import type { Matcher, QuestionText, ScenarioText, ScoredScenario } from "./Matcher";
import { matchingMessage, type PromptVariant } from "./promptVariants";

const reply = z.object({ scores: z.array(z.object({ id: z.string(), score: z.number().int().min(0).max(100) })) });

/** The LLM Matcher (spec #1): an OpenRouter chat model, via the Worker's "matching" job, scores every Scenario 0–100.
 * Scenarios are sent under short ids (S1, S2…), which keeps the prompt small and the Vault's ids out of it. */
export function createLlmMatcher(gateway: ModelGateway, variant: PromptVariant): Matcher {
  return {
    name: `LLM (${variant.name})`,
    async rank(question: QuestionText, scenarios: ScenarioText[]): Promise<ScoredScenario[]> {
      const short = scenarios.map((scenario, i) => ({ ...scenario, id: `S${i + 1}` }));
      const { scores } = await gateway.generate({ job: "matching", system: variant.system, user: matchingMessage(question, short), schema: reply });
      const scoreOf = new Map(scores.map((s) => [s.id, s.score]));
      // A Scenario the model left out scores 0; ids it made up are ignored.
      return scenarios.map((scenario, i) => ({ scenarioId: scenario.id, score: scoreOf.get(`S${i + 1}`) ?? 0 }));
    },
  };
}

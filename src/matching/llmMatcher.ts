import { z } from "zod";
import type { ReasoningEffort } from "../../shared/workerProtocol";
import type { ModelGateway } from "../model-gateway/ModelGateway";
import type { Matcher, QuestionText, ScenarioText, ScoredScenario } from "./Matcher";
import { matchingMessage, type PromptVariant } from "./promptVariants";
import { withShortIds } from "./shortIds";

/** Every variant's reply: `notes` first, so a variant can reason before it scores (chain-of-thought); the others
 * leave it empty. Long notes are cut short rather than failing the call. (A preprocess, not a transform: a transform
 * can't be turned into the JSON Schema the model is sent.) */
const reply = z.object({
  notes: z.preprocess((v) => (typeof v === "string" ? v.slice(0, 4000) : (v ?? "")), z.string()),
  scores: z.array(z.object({ id: z.string(), score: z.number().int().min(0).max(100) })),
});

/** Which model scores, and how hard it reasons: the Worker's defaults are overridden per call. */
export type LlmSetup = { model: string; reasoningEffort: ReasoningEffort };

/** The LLM Matcher (spec #1): an OpenRouter chat model, via the Worker's "matching" job, scores every Scenario 0–100.
 * A reply that leaves a Scenario out, or scores one twice, is refused rather than guessed at. Its name includes the
 * Prompt Variant, model and effort, so each combination has its own recorded threshold. */
/** An LLM Matcher's name, as gapThresholds.json records its threshold. */
export const llmMatcherName = (variant: PromptVariant, { model, reasoningEffort }: LlmSetup) => `LLM (${variant.name}) · ${model} · ${reasoningEffort} effort`;

export function createLlmMatcher(gateway: ModelGateway, variant: PromptVariant, { model, reasoningEffort }: LlmSetup): Matcher {
  return {
    name: llmMatcherName(variant, { model, reasoningEffort }),
    async rank(question: QuestionText, scenarios: ScenarioText[]): Promise<ScoredScenario[]> {
      const ids = withShortIds(scenarios);
      const { scores } = await gateway.generate({
        job: "matching",
        model,
        reasoningEffort,
        system: variant.system,
        user: matchingMessage(question, ids.sent),
        schema: reply,
      });
      const byScenario = ids.byScenario(scores);
      return scenarios.map(({ id }) => ({ scenarioId: id, score: byScenario.get(id)!.score }));
    },
  };
}

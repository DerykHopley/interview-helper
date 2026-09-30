// Which Matcher the app ships, with which Prompt Variant and model (spec #1: chosen by config; switching is a one-line
// change). The matching model is set here so each Matcher, variant and model has its own recorded threshold; other
// jobs use the Worker's defaults (worker/wrangler.jsonc JOB_MODELS). Each Matcher's Gap threshold is on its own scale,
// recorded in gapThresholds.json by the Matcher Report (#14).
import type { ModelGateway } from "../model-gateway/ModelGateway";
import gapThresholds from "./gapThresholds.json";
import { createLlmMatcher } from "./llmMatcher";
import type { Matcher } from "./Matcher";
import { PROMPT_VARIANTS, type PromptVariantId } from "./promptVariants";

/** How a Matcher is set up: the LLM Matcher's Prompt Variant and model. #20 and #21 add Jev and embedding Matchers. */
type MatcherSetup = { promptVariant: PromptVariantId; model: string };

/** Every Matcher the app can ship. */
export const MATCHERS = {
  llm: { create: (gateway: ModelGateway, { promptVariant, model }: MatcherSetup) => createLlmMatcher(gateway, PROMPT_VARIANTS[promptVariant], model) },
} satisfies Record<string, { create: (gateway: ModelGateway, setup: MatcherSetup) => Matcher }>;

export const MATCHING_CONFIG = {
  matcher: "llm",
  promptVariant: "rubric-zero-shot",
  /** Must be on the Worker's ALLOWED_MODELS. To compare another model before #18, change it here and run the report. */
  model: "openai/gpt-5-mini",
  /** How many Matches are shown per Question. */
  shown: 3,
} as const satisfies MatcherSetup & { matcher: keyof typeof MATCHERS; shown: number };

/** gapThresholds.json: each Matcher's threshold, by its name, and the report that measured it. */
export type RecordedThresholds = Record<string, { gapThreshold: number; report: string | null }>;

/** A Matcher's Gap threshold (a Question is a Gap if even its best score is below it), as the latest Matcher Report
 * recorded it. An app test checks the shipped Matcher has one. */
export function gapThresholdFor(matcherName: string): number {
  const recorded = (gapThresholds as RecordedThresholds)[matcherName];
  if (!recorded) throw new Error(`No Gap threshold is recorded for "${matcherName}"; run the Matcher Report for it`);
  return recorded.gapThreshold;
}

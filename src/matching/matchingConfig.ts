// Which Matcher the app ships, with which Prompt Variant, model and reasoning effort (spec #1: chosen by config;
// switching is a one-line change, once the Matcher Report has recorded that setup's threshold). The matching model and
// effort are set here so each setup has its own recorded threshold; other jobs use the Worker's defaults
// (worker/wrangler.jsonc JOB_MODELS, JOB_SETTINGS). Each Matcher's Gap threshold is on its own scale,
// recorded in gapThresholds.json by the Matcher Report (#14).
import { REASONING_EFFORTS } from "../../shared/workerProtocol";
import type { ModelGateway } from "../model-gateway/ModelGateway";
import gapThresholds from "./gapThresholds.json";
import { createLlmMatcher, type LlmSetup } from "./llmMatcher";
import type { Matcher } from "./Matcher";
import { PROMPT_VARIANTS, type PromptVariantId } from "./promptVariants";

/** How a Matcher is set up: the LLM Matcher's Prompt Variant, model and reasoning effort. #20 and #21 add Jev and
 * embedding Matchers. */
export type MatcherSetup = LlmSetup & { promptVariant: PromptVariantId };

/** Every Matcher the app can ship. */
export const MATCHERS = {
  llm: { create: (gateway: ModelGateway, { promptVariant, ...setup }: MatcherSetup) => createLlmMatcher(gateway, PROMPT_VARIANTS[promptVariant], setup) },
} satisfies Record<string, { create: (gateway: ModelGateway, setup: MatcherSetup) => Matcher }>;

export const MATCHING_CONFIG = {
  matcher: "llm",
  promptVariant: "rubric-zero-shot",
  /** Must be on the Worker's ALLOWED_MODELS. To compare another model before #18, change it here and run the report. */
  model: "openai/gpt-5-mini",
  /** Compared in the Matcher Report's Reasoning effort section (#15). */
  reasoningEffort: "low",
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

/** A Setup the Matcher Report has measured, so it has a Gap threshold: what the Developer panel (#17) may pick. */
export type MeasuredSetup = { name: string; setup: MatcherSetup; gapThreshold: number };

/** Every measured Setup, read back from its Matcher name in gapThresholds.json ("LLM (<variant>) · <model> · <effort>
 * effort"). A name that no longer reads as a current Prompt Variant and effort is left out. */
export function measuredSetups(): MeasuredSetup[] {
  return Object.entries(gapThresholds as RecordedThresholds).flatMap(([name, { gapThreshold }]) => {
    const parts = /^LLM \((.+)\) · (.+) · (\w+) effort$/.exec(name);
    const promptVariant = (Object.keys(PROMPT_VARIANTS) as PromptVariantId[]).find((id) => PROMPT_VARIANTS[id].name === parts?.[1]);
    const reasoningEffort = REASONING_EFFORTS.find((e) => e === parts?.[3]);
    return parts && promptVariant && reasoningEffort ? [{ name, setup: { promptVariant, model: parts[2], reasoningEffort }, gapThreshold }] : [];
  });
}

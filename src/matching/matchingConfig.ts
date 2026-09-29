// Which Matcher the app ships, and how it's prompted (spec #1: chosen by config; switching is a one-line change).
// Models are set per job in the Worker (worker/wrangler.jsonc JOB_MODELS: "matching", "match-reasons").
import type { ModelGateway } from "../model-gateway/ModelGateway";
import { createLlmMatcher } from "./llmMatcher";
import type { Matcher } from "./Matcher";
import { PROMPT_VARIANTS, type PromptVariantId } from "./promptVariants";

/** Every Matcher the app can ship, each with its own Gap threshold on its own scale: a Question is a Gap if even its
 * best score is below it. The LLM Matcher's 50 is a placeholder until #14's Matcher Report records a measured one;
 * #20 and #21 add Jev and embedding Matchers here. */
export const MATCHERS = {
  llm: { gapThreshold: 50, create: (gateway: ModelGateway, variant: PromptVariantId) => createLlmMatcher(gateway, PROMPT_VARIANTS[variant]) },
} satisfies Record<string, { gapThreshold: number; create: (gateway: ModelGateway, variant: PromptVariantId) => Matcher }>;

export const MATCHING_CONFIG = {
  matcher: "llm",
  promptVariant: "rubric-zero-shot",
  /** How many Matches are shown per Question. */
  shown: 3,
} as const satisfies { matcher: keyof typeof MATCHERS; promptVariant: PromptVariantId; shown: number };

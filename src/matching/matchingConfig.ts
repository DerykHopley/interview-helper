// Which Matcher the app ships, and its Setup: an LLM Matcher's Prompt Variant, model and reasoning effort, or Jev's
// model and way of asking (#20) (spec #1: chosen by config;
// switching is a one-line change, once the Matcher Report has recorded that setup's threshold). The matching model and
// effort are set here so each setup has its own recorded threshold; other jobs use the Worker's defaults
// (worker/wrangler.jsonc JOB_MODELS, JOB_SETTINGS). Each Matcher's Gap threshold is on its own scale,
// recorded in gapThresholds.json by the Matcher Report (#14).
import { REASONING_EFFORTS } from "../../shared/workerProtocol";
import type { ModelGateway } from "../model-gateway/ModelGateway";
import gapThresholds from "./gapThresholds.json";
import { createJevMatcher, JEV_ASKS, type JevSetup } from "./jevMatcher";
import { createLlmMatcher, type LlmSetup } from "./llmMatcher";
import type { Matcher } from "./Matcher";
import { PROMPT_VARIANTS, type PromptVariantId } from "./promptVariants";

/** An LLM Matcher's Setup: its Prompt Variant, model and reasoning effort. */
export type LlmMatcherSetup = { matcher: "llm"; promptVariant: PromptVariantId } & LlmSetup;
/** A Jev Matcher's Setup (#20): its decision model, and how it asks. */
export type JevMatcherSetup = { matcher: "jev" } & JevSetup;
/** How a Matcher is set up, by its kind. #21 adds embedding Matchers. */
export type MatcherSetup = LlmMatcherSetup | JevMatcherSetup;

/** The Matcher a Setup describes: the one way the app and the Matcher Report make one. */
export function createMatcher(gateway: ModelGateway, setup: MatcherSetup): Matcher {
  if (setup.matcher === "jev") return createJevMatcher(gateway, setup);
  const { promptVariant, ...llm } = setup;
  return createLlmMatcher(gateway, PROMPT_VARIANTS[promptVariant], llm);
}

/** Whether two Setups are the same: the same kind, with the same settings. */
export function sameSetup(a: MatcherSetup, b: MatcherSetup) {
  if (a.matcher === "llm" && b.matcher === "llm") return a.promptVariant === b.promptVariant && a.model === b.model && a.reasoningEffort === b.reasoningEffort;
  return a.matcher === "jev" && b.matcher === "jev" && a.ask === b.ask && a.model === b.model;
}

/** The Matcher the app ships. Any Setup works here (a Jev one is `{ matcher: "jev", ask: "noul", model:
 * "typesafe/jev-1.13" }`), once the Matcher Report has recorded its threshold. */
export const MATCHING_CONFIG = {
  matcher: "llm",
  promptVariant: "rubric-zero-shot",
  /** Must be on the Worker's ALLOWED_MODELS. To compare another model before #18, change it here and run the report. */
  model: "openai/gpt-5-mini",
  /** Compared in the Matcher Report's Reasoning effort section (#15). */
  reasoningEffort: "low",
  /** How many Matches are shown per Question. */
  shown: 3,
} as const satisfies MatcherSetup & { shown: number };

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

/** The Setup a Matcher name describes ("LLM (<variant>) · <model> · <effort> effort", or "Jev (<ask>) · <model>"), or
 * null for a name that no longer reads as a current Prompt Variant, effort or way of asking. */
function setupNamed(name: string): MatcherSetup | null {
  const llm = /^LLM \((.+)\) · (.+) · (\w+) effort$/.exec(name);
  if (llm) {
    const promptVariant = (Object.keys(PROMPT_VARIANTS) as PromptVariantId[]).find((id) => PROMPT_VARIANTS[id].name === llm[1]);
    const reasoningEffort = REASONING_EFFORTS.find((e) => e === llm[3]);
    return promptVariant && reasoningEffort ? { matcher: "llm", promptVariant, model: llm[2], reasoningEffort } : null;
  }
  const jev = /^Jev \((\w+)\) · (.+)$/.exec(name);
  const ask = JEV_ASKS.find((a) => a === jev?.[1]);
  return jev && ask ? { matcher: "jev", ask, model: jev[2] } : null;
}

/** Every measured Setup, read back from its Matcher name in gapThresholds.json. */
export function measuredSetups(recorded: RecordedThresholds = gapThresholds): MeasuredSetup[] {
  return Object.entries(recorded).flatMap(([name, { gapThreshold }]) => {
    const setup = setupNamed(name);
    return setup ? [{ name, setup, gapThreshold }] : [];
  });
}

/** A measured Setup as the Developer panel lists it. */
export function setupLabel({ setup, gapThreshold }: MeasuredSetup) {
  const described = setup.matcher === "llm" ? `${PROMPT_VARIANTS[setup.promptVariant].name} · ${setup.model} · ${setup.reasoningEffort} effort` : `Jev (${setup.ask}) · ${setup.model}`;
  return `${described} — threshold ${gapThreshold}`;
}

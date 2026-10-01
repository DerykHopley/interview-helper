// What a Matcher Report runs: the shipped Setup, or with `--all-setups` (#15) every Prompt Variant on the shipped
// model and effort and each compared reasoning effort on the shipped variant (the shipped Setup is in both, but runs
// once); and where the report is written.
import { normalize } from "node:path";
import type { ReasoningEffort } from "../../shared/workerProtocol";
import type { MatcherSetup } from "../../src/matching/matchingConfig";
import { PROMPT_VARIANTS, type PromptVariantId } from "../../src/matching/promptVariants";

/** The efforts compared: cheaper and faster, what ships, and slower and costlier. */
export const COMPARED_EFFORTS: ReasoningEffort[] = ["minimal", "low", "medium"];

export type PlannedSection = { title: string; intro: string; setups: MatcherSetup[] };
export type ReportPlan = { setups: MatcherSetup[]; sections: PlannedSection[] };

/** The models compared with --models (#18): the spec's GPT-5 sizes and a spread across companies, all on the owner's
 * OpenRouter allow-list and in the Worker's ALLOWED_MODELS. That list has no plain gpt-5, so gpt-5.4 stands in for
 * the full size. A test call on 2026-09-30 found claude-3-haiku and deepseek-v4-flash unavailable. */
export const COMPARED_MODELS = [
  "openai/gpt-5-nano",
  "openai/gpt-5-mini",
  "openai/gpt-5.4",
  "openai/gpt-4o-mini",
  "openai/gpt-6-luna",
  "google/gemini-3.8-flash",
  "google/gemma-4-31b-it",
  "anthropic/claude-haiku-4.5",
  "minimax/minimax-m2.7",
];

const same = (a: MatcherSetup, b: MatcherSetup) => a.promptVariant === b.promptVariant && a.model === b.model && a.reasoningEffort === b.reasoningEffort;

/** With `allSetups`, every Prompt Variant and every compared effort; with `models`, the shipped variant and effort on
 * each of those models. Each Setup runs once, however many sections it's in. */
export function reportPlan(shipped: MatcherSetup, { allSetups = false, models = [] }: { allSetups?: boolean; models?: string[] }): ReportPlan {
  const sections: PlannedSection[] = [];
  if (allSetups) {
    sections.push(
      {
        title: "Prompt Variants",
        intro: `Each prompting technique on the shipped model and effort (${shipped.model}, ${shipped.reasoningEffort}). Each adds one technique to the same plain zero-shot instruction, with the same message and output schema.`,
        setups: (Object.keys(PROMPT_VARIANTS) as PromptVariantId[]).map((promptVariant) => ({ ...shipped, promptVariant })),
      },
      {
        title: "Reasoning effort",
        intro: `The shipped Prompt Variant on ${shipped.model} at each reasoning effort. The GPT-5 models take no temperature on OpenRouter, so effort is the setting compared.`,
        setups: [...new Set([...COMPARED_EFFORTS, shipped.reasoningEffort])].map((reasoningEffort) => ({ ...shipped, reasoningEffort })),
      },
    );
  }
  if (models.length) {
    sections.push({
      title: "Models",
      intro: `The shipped Prompt Variant and effort (${shipped.promptVariant}, ${shipped.reasoningEffort}) on each model. Models without reasoning ignore the effort. Plain gpt-5 isn't on the owner's OpenRouter allow-list, so gpt-5.4 stands in for the full size.`,
      setups: [...new Set(models)].map((model) => ({ ...shipped, model })),
    });
  }
  const setups = sections.flatMap((section) => section.setups).filter((s, i, all) => all.findIndex((t) => same(s, t)) === i);
  return { setups: setups.length ? setups : [shipped], sections };
}

/** Reports go in the committed eval/reports/, except those on a set in the git-ignored eval/private/: its Scenarios are
 * in the saved raw scores, so they stay private too. */
export const reportsDirFor = (setPath: string) => (normalize(setPath).startsWith("eval/private/") ? "eval/private/reports" : "eval/reports");

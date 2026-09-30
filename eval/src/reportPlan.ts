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

/** Just the shipped Setup. */
export const shippedPlan = (shipped: MatcherSetup): ReportPlan => ({ setups: [shipped], sections: [] });

/** Every Prompt Variant and every compared effort. */
export function reportPlan(shipped: MatcherSetup): ReportPlan {
  const variants = (Object.keys(PROMPT_VARIANTS) as PromptVariantId[]).map((promptVariant) => ({ ...shipped, promptVariant }));
  const efforts = [...new Set([...COMPARED_EFFORTS, shipped.reasoningEffort])].map((reasoningEffort) => ({ ...shipped, reasoningEffort }));
  const sections = [
    {
      title: "Prompt Variants",
      intro: `Each prompting technique on the shipped model and effort (${shipped.model}, ${shipped.reasoningEffort}). Each adds one technique to the same plain zero-shot instruction, with the same message and output schema.`,
      setups: variants,
    },
    {
      title: "Reasoning effort",
      intro: `The shipped Prompt Variant on ${shipped.model} at each reasoning effort. The GPT-5 models take no temperature on OpenRouter, so effort is the setting compared.`,
      setups: efforts,
    },
  ];
  const same = (a: MatcherSetup, b: MatcherSetup) => a.promptVariant === b.promptVariant && a.model === b.model && a.reasoningEffort === b.reasoningEffort;
  const setups = [...variants, ...efforts].filter((s, i, all) => all.findIndex((t) => same(s, t)) === i);
  return { setups, sections };
}

/** Reports go in the committed eval/reports/, except those on a set in the git-ignored eval/private/: its Scenarios are
 * in the saved raw scores, so they stay private too. */
export const reportsDirFor = (setPath: string) => (normalize(setPath).startsWith("eval/private/") ? "eval/private/reports" : "eval/reports");

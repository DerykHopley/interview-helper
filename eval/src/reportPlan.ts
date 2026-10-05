// What a Matcher Report runs: the shipped Setup, or with `--all-setups` (#15) every Prompt Variant on the shipped
// model and effort and each compared reasoning effort on the shipped variant (the shipped Setup is in both, but runs
// once); and where the report is written.
import { normalize } from "node:path";
import type { ReasoningEffort } from "../../shared/workerProtocol";
import { JEV_ASKS, JEV_MODEL } from "../../src/matching/jevMatcher";
import { sameSetup, type MatcherSetup } from "../../src/matching/matchingConfig";
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

/** With `allSetups`, every Prompt Variant and every compared effort; with `models`, the shipped variant and effort on
 * each of those models; with `jev`, each way of asking Jev (#20). Those first two vary an LLM Setup, so they need one
 * to ship. The shipped Setup always runs, and each Setup runs once, however many sections it's in. */
export function reportPlan(shipped: MatcherSetup, { allSetups = false, models = [], jev = false }: { allSetups?: boolean; models?: string[]; jev?: boolean }): ReportPlan {
  const sections: PlannedSection[] = [];
  const llm = shipped.matcher === "llm" ? shipped : null;
  if ((allSetups || models.length) && !llm) throw new Error("--all-setups and --models vary the shipped LLM Setup; ship an LLM Setup to run them");
  if (allSetups && llm) {
    sections.push(
      {
        title: "Prompt Variants",
        intro: `Each prompting technique on the shipped model and effort (${llm.model}, ${llm.reasoningEffort}). Each adds one technique to the same plain zero-shot instruction, with the same message and output schema.`,
        setups: (Object.keys(PROMPT_VARIANTS) as PromptVariantId[]).map((promptVariant) => ({ ...llm, promptVariant })),
      },
      {
        title: "Reasoning effort",
        intro: `The shipped Prompt Variant on ${llm.model} at each reasoning effort. The GPT-5 models take no temperature on OpenRouter, so effort is the setting compared.`,
        setups: [...new Set([...COMPARED_EFFORTS, llm.reasoningEffort])].map((reasoningEffort) => ({ ...llm, reasoningEffort })),
      },
    );
  }
  if (models.length && llm) {
    sections.push({
      title: "Models",
      intro: `The shipped Prompt Variant and effort (${llm.promptVariant}, ${llm.reasoningEffort}) on each model. Models without reasoning ignore the effort. Plain gpt-5 isn't on the owner's OpenRouter allow-list, so gpt-5.4 stands in for the full size.`,
      setups: [...new Set(models)].map((model) => ({ ...llm, model })),
    });
  }
  if (jev) {
    sections.push({
      title: "Jev",
      intro: `TypeSafe's decision model (${JEV_MODEL}), asked two ways, each in one call per Question: **choice** picks among every Scenario and "none of them", scoring each by its probability; **yes-no** asks yes or no for each Scenario (Jev's "noul" questions), scoring each by its probability of yes. Scores are probabilities × 100, on Jev's own scale. Jev writes no text, so Match reasons still come from the reasons model, and no Prompt Variant or effort applies.`,
      setups: JEV_ASKS.map((ask) => ({ matcher: "jev", ask, model: JEV_MODEL })),
    });
  }
  const setups = [shipped, ...sections.flatMap((section) => section.setups)].filter((s, i, all) => all.findIndex((t) => sameSetup(s, t)) === i);
  return { setups, sections };
}

/** Reports go in the committed eval/reports/, except those on a set in the git-ignored eval/private/: its Scenarios are
 * in the saved raw scores, so they stay private too. */
export const reportsDirFor = (setPath: string) => (normalize(setPath).startsWith("eval/private/") ? "eval/private/reports" : "eval/reports");

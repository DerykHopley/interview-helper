// Which Matcher the app ships, and its Setup (spec #1: switching is a one-line change here, once the Matcher Report has
// recorded that Setup's threshold). An LLM Matcher's Setup is its Prompt Variant, model and reasoning effort; a Jev
// Matcher's is its model and how it asks (#20). The matching model and effort are set here so each Setup has its own
// recorded threshold; other jobs use the Worker's defaults (worker/wrangler.jsonc JOB_MODELS, JOB_SETTINGS). Each
// Matcher's Gap threshold is on its own scale, recorded in gapThresholds.json by the Matcher Report (#14).
import { REASONING_EFFORTS } from "../../shared/workerProtocol";
import type { ModelGateway } from "../model-gateway/ModelGateway";
import gapThresholds from "./gapThresholds.json";
import { createJevMatcher, JEV_ASKS, jevMatcherName, type JevSetup } from "./jevMatcher";
import { createLlmMatcher, llmMatcherName, type LlmSetup } from "./llmMatcher";
import type { Matcher } from "./Matcher";
import { PROMPT_VARIANTS, type PromptVariantId } from "./promptVariants";

/** An LLM Matcher's Setup: its Prompt Variant, model and reasoning effort. */
export type LlmMatcherSetup = { matcher: "llm"; promptVariant: PromptVariantId } & LlmSetup;
/** A Jev Matcher's Setup (#20): its decision model, and how it asks. */
export type JevMatcherSetup = { matcher: "jev" } & JevSetup;
/** How a Matcher is set up, by its kind. */
export type MatcherSetup = LlmMatcherSetup | JevMatcherSetup;

/** Everything that differs by kind of Matcher: how to make one, its name for a Setup (as gapThresholds.json records
 * it), the Setup a recorded name describes (null if it no longer reads as a current one), how the Developer panel lists
 * it, and when two Setups are the same. A new kind (#21) is one more entry in KINDS. */
type MatcherKind<Setup extends MatcherSetup> = {
  create: (gateway: ModelGateway, setup: Setup) => Matcher;
  name: (setup: Setup) => string;
  parse: (name: string) => Setup | null;
  label: (setup: Setup) => string;
  same: (a: Setup, b: Setup) => boolean;
};

const KINDS: { [Kind in MatcherSetup["matcher"]]: MatcherKind<Extract<MatcherSetup, { matcher: Kind }>> } = {
  llm: {
    create: (gateway, { promptVariant, ...setup }) => createLlmMatcher(gateway, PROMPT_VARIANTS[promptVariant], setup),
    name: ({ promptVariant, ...setup }) => llmMatcherName(PROMPT_VARIANTS[promptVariant], setup),
    parse(name) {
      const parts = /^LLM \((.+)\) · (.+) · (\w+) effort$/.exec(name);
      const promptVariant = (Object.keys(PROMPT_VARIANTS) as PromptVariantId[]).find((id) => PROMPT_VARIANTS[id].name === parts?.[1]);
      const reasoningEffort = REASONING_EFFORTS.find((e) => e === parts?.[3]);
      return parts && promptVariant && reasoningEffort ? { matcher: "llm", promptVariant, model: parts[2], reasoningEffort } : null;
    },
    label: ({ promptVariant, model, reasoningEffort }) => `${PROMPT_VARIANTS[promptVariant].name} · ${model} · ${reasoningEffort} effort`,
    same: (a, b) => a.promptVariant === b.promptVariant && a.model === b.model && a.reasoningEffort === b.reasoningEffort,
  },
  jev: {
    create: createJevMatcher,
    name: jevMatcherName,
    parse(name) {
      const parts = /^Jev \((.+)\) · (.+)$/.exec(name);
      const ask = JEV_ASKS.find((a) => a === parts?.[1]);
      return parts && ask ? { matcher: "jev", ask, model: parts[2] } : null;
    },
    label: jevMatcherName,
    same: (a, b) => a.ask === b.ask && a.model === b.model,
  },
};

/** A Setup's kind. TypeScript can't tie a union's tag to its entry in KINDS, hence the one cast. */
const kindOf = <Setup extends MatcherSetup>(setup: Setup) => KINDS[setup.matcher] as unknown as MatcherKind<Setup>;

/** The Matcher a Setup describes: the one way the app and the Matcher Report make one. */
export const createMatcher = (gateway: ModelGateway, setup: MatcherSetup) => kindOf(setup).create(gateway, setup);

/** A Setup's Matcher name, as gapThresholds.json records its threshold. */
export const matcherName = (setup: MatcherSetup) => kindOf(setup).name(setup);

/** Whether two Setups are the same: the same kind, with the same settings. */
export const sameSetup = (a: MatcherSetup, b: MatcherSetup) => a.matcher === b.matcher && kindOf(a).same(a, b);

/** The Matcher the app ships. Any measured Setup works here, e.g. `{ matcher: "jev", ask: "yes-no", model: JEV_MODEL }`,
 * once the Matcher Report has recorded its threshold. */
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

/** Every measured Setup, read back from its Matcher name in gapThresholds.json. */
export function measuredSetups(recorded: RecordedThresholds = gapThresholds): MeasuredSetup[] {
  return Object.entries(recorded).flatMap(([name, { gapThreshold }]) => {
    const setup = Object.values(KINDS).map((kind) => kind.parse(name)).find((parsed) => parsed !== null);
    return setup ? [{ name, setup, gapThreshold }] : [];
  });
}

/** A measured Setup as the Developer panel lists it. */
export const setupLabel = ({ setup, gapThreshold }: MeasuredSetup) => `${kindOf(setup).label(setup)} — threshold ${gapThreshold}`;

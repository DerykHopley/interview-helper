// PROTOTYPE — in-memory stand-in for the Developer panel (issue #17; spec stories 107–112). No real calls:
// prices are a sample of what OpenRouter's models endpoint returns, and "Simulate a call" makes up token counts
// from the job's settings, so the panel can show how settings change cost.
import { useState } from "react";

export type JobKey = "questions" | "matching" | "cowriting";
export type Effort = "minimal" | "low" | "medium" | "high";
export type JobSettings = { model: string; variant: string; temperature: number; maxTokens: number; effort: Effort };

export const JOBS: { key: JobKey; name: string; what: string }[] = [
  { key: "questions", name: "Question generation", what: "Writes ~8 behavioural Questions from a Job Spec" },
  { key: "matching", name: "Matching", what: "Ranks up to 3 Scenarios for a Question, with reasons, or flags a Gap" },
  { key: "cowriting", name: "Co-writing", what: "Asks questions and arranges the Candidate's answers into a draft" },
];

// The Worker's allowed list. Prices in US$ per million tokens (input / output), as OpenRouter reports them.
export const MODELS: { id: string; input: number; output: number; reasoning: boolean }[] = [
  { id: "openai/gpt-5-nano", input: 0.05, output: 0.4, reasoning: true },
  { id: "openai/gpt-5-mini", input: 0.25, output: 2.0, reasoning: true },
  { id: "openai/gpt-5", input: 1.25, output: 10.0, reasoning: true },
  { id: "meta-llama/llama-3.3-70b-instruct", input: 0.13, output: 0.39, reasoning: false },
];
export const PRICES_FETCHED = "2 minutes ago";

export const VARIANTS = ["zero-shot", "few-shot", "chain-of-thought", "role prompt", "structured output"];

export const DEFAULTS: Record<JobKey, JobSettings> = {
  questions: { model: "openai/gpt-5-mini", variant: "few-shot", temperature: 0.7, maxTokens: 1200, effort: "low" },
  matching: { model: "openai/gpt-5-mini", variant: "structured output", temperature: 0.2, maxTokens: 600, effort: "low" },
  cowriting: { model: "openai/gpt-5-mini", variant: "role prompt", temperature: 0.4, maxTokens: 500, effort: "minimal" },
};

export type Call = { id: number; when: string; job: JobKey; model: string; variant: string; tokensIn: number; tokensOut: number; ms: number; cost: number };

const price = (model: string) => MODELS.find((m) => m.id === model) ?? MODELS[1];
export const costOf = (model: string, tIn: number, tOut: number) => (tIn * price(model).input + tOut * price(model).output) / 1_000_000;
export const fmtCost = (c: number) => (c < 0.01 ? `$${c.toFixed(5)}` : `$${c.toFixed(4)}`);

const SEED: Call[] = ([
  { id: 1, when: "09:41:12", job: "questions", model: "openai/gpt-5-mini", variant: "few-shot", tokensIn: 1840, tokensOut: 910, ms: 4200, cost: 0 },
  { id: 2, when: "09:42:03", job: "matching", model: "openai/gpt-5-mini", variant: "structured output", tokensIn: 2650, tokensOut: 240, ms: 1900, cost: 0 },
  { id: 3, when: "09:42:40", job: "matching", model: "openai/gpt-5-mini", variant: "structured output", tokensIn: 2610, tokensOut: 210, ms: 1700, cost: 0 },
  { id: 4, when: "09:45:18", job: "cowriting", model: "openai/gpt-5-mini", variant: "role prompt", tokensIn: 980, tokensOut: 120, ms: 1100, cost: 0 },
  { id: 5, when: "09:45:51", job: "cowriting", model: "openai/gpt-5-mini", variant: "role prompt", tokensIn: 1150, tokensOut: 140, ms: 1200, cost: 0 },
] as Call[]).map((c) => ({ ...c, cost: costOf(c.model, c.tokensIn, c.tokensOut) }));

const EFFORT_OUT: Record<Effort, number> = { minimal: 1, low: 1.4, medium: 2.2, high: 3.5 };
const BASE: Record<JobKey, [number, number]> = { questions: [1800, 850], matching: [2600, 220], cowriting: [1050, 130] };

export function useDev() {
  const params = new URLSearchParams(location.search);
  // Hidden by default: ?dev=1 or Ctrl+Shift+D reveals it (the real build would keep it out of Candidate builds too).
  const [enabled, setEnabled] = useState(params.has("dev"));
  const [settings, setSettings] = useState<Record<JobKey, JobSettings>>(() => {
    const s = structuredClone(DEFAULTS);
    if (params.has("overrides")) { s.matching.model = "openai/gpt-5-nano"; s.matching.variant = "chain-of-thought"; s.questions.temperature = 0.9; }
    return s;
  });
  const [calls, setCalls] = useState<Call[]>(SEED);

  return {
    enabled, setEnabled, settings, calls,
    set(job: JobKey, patch: Partial<JobSettings>) { setSettings((s) => ({ ...s, [job]: { ...s[job], ...patch } })); },
    reset(job?: JobKey) { setSettings((s) => (job ? { ...s, [job]: { ...DEFAULTS[job] } } : structuredClone(DEFAULTS))); },
    isOverridden: (job: JobKey, field: keyof JobSettings) => settings[job][field] !== DEFAULTS[job][field],
    /** Make up a call with the job's current settings, so cost changes are visible. */
    simulate(job: JobKey) {
      const st = settings[job];
      const [bi, bo] = BASE[job];
      const tIn = Math.round(bi * (st.variant === "few-shot" ? 1.35 : 1) * (0.95 + Math.random() * 0.1));
      const tOut = Math.min(st.maxTokens, Math.round(bo * (price(st.model).reasoning ? EFFORT_OUT[st.effort] : 1) * (st.variant === "chain-of-thought" ? 1.8 : 1)));
      const ms = Math.round((st.model.includes("nano") ? 0.6 : st.model === "openai/gpt-5" ? 2.2 : 1) * (tOut * 4 + 600));
      const now = new Date();
      setCalls((c) => [{ id: Date.now(), when: now.toTimeString().slice(0, 8), job, model: st.model, variant: st.variant, tokensIn: tIn, tokensOut: tOut, ms, cost: costOf(st.model, tIn, tOut) }, ...c]);
    },
  };
}
export type Dev = ReturnType<typeof useDev>;

export const jobName = (k: JobKey) => JOBS.find((j) => j.key === k)!.name;
export const totalCost = (calls: Call[]) => calls.reduce((n, c) => n + c.cost, 0);

// The Developer panel's settings (#17): the owner's own, kept in this browser's localStorage, not the Vault, since
// they aren't Candidate data. While developer mode is on, they fill in each model call's model, token cap, reasoning
// effort and temperature, and pick matching's Setup. Turned off, the Worker's defaults and the shipped Setup apply.
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { REASONING_EFFORTS, type DecisionJob, type ModelJob } from "../../shared/workerProtocol";
import type { ModelGateway, ModelsResponse } from "../model-gateway/ModelGateway";

/** The jobs the panel sets, with the names it shows. The reason judge runs in the Matcher Report only. */
export const PANEL_JOBS = [
  ["question-generation", "Question generation"],
  ["matching", "Matching"],
  ["match-reasons", "Match reasons"],
  ["co-writing", "Co-writing"],
  ["feedback", "Feedback"],
  ["readiness-report", "Readiness Report"],
] as const satisfies readonly (readonly [ModelJob, string])[];
export type PanelJob = (typeof PANEL_JOBS)[number][0];
export const jobName = (job: ModelJob | DecisionJob) => PANEL_JOBS.find(([key]) => key === job)?.[1] ?? job;

const jobOverride = z.object({
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  reasoningEffort: z.enum(REASONING_EFFORTS).optional(),
  temperature: z.number().min(0).max(2).optional(),
});
export type JobOverride = z.infer<typeof jobOverride>;

const settingsSchema = z.object({
  /** Whether developer mode is on: the DEV tab shows, and these settings apply. */
  enabled: z.boolean().default(false),
  jobs: z.record(z.string(), jobOverride).default({}),
  /** Matching's Setup, by its Matcher name: one the Matcher Report measured, or null for the shipped one. */
  matchingSetup: z.string().nullable().default(null),
});
export type DevSettings = z.infer<typeof settingsSchema>;

const KEY = "interview-helper.developer";
const DEFAULTS: DevSettings = { enabled: false, jobs: {}, matchingSetup: null };

function readStored(): DevSettings {
  try {
    const parsed = settingsSchema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    return parsed.success ? parsed.data : DEFAULTS;
  } catch {
    return DEFAULTS; // storage blocked, or not JSON (and in Node, the Matcher Report, there's no localStorage)
  }
}

let current: DevSettings | null = null;
const listeners = new Set<() => void>();

/** The settings, read once from localStorage and kept in step with every change. */
export const devSettings = {
  get: (): DevSettings => (current ??= readStored()),
  set(change: (settings: DevSettings) => DevSettings) {
    current = change(devSettings.get());
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      // storage blocked: the settings last until the page is closed
    }
    for (const listener of listeners) listener();
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
  /** Forgets what was read, so the next read comes from localStorage again (a new page, or a test). */
  reload: () => void (current = null),
};

// A change made in another tab arrives as a storage event: read it, so this tab doesn't write over it.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY && e.key !== null) return;
    devSettings.reload();
    for (const listener of listeners) listener();
  });
}

export const useDevSettings = () => useSyncExternalStore(devSettings.subscribe, devSettings.get);

/** How many settings differ from the config defaults: each job's, and matching's Setup. */
export function overrideCount({ jobs, matchingSetup }: DevSettings) {
  const perJob = Object.values(jobs).reduce((n, o) => n + Object.values(o).filter((v) => v !== undefined).length, 0);
  return perJob + (matchingSetup ? 1 : 0);
}

/** The models a chat job may pick: a decision model (Jev, #20) can't run one. */
export const chatModels = (allowed: ModelsResponse) => allowed.models.filter((m) => m.kind === "chat");

/** The panel's settings for a job, while developer mode is on. Matching takes none: its Setup runs as it was measured. */
export function overridesFor(job: ModelJob): JobOverride {
  const settings = devSettings.get();
  return settings.enabled && job !== "matching" ? (settings.jobs[job] ?? {}) : {};
}

/** A saved setting the Worker no longer allows, and why, e.g. after its caps or default models change. */
export type Dropped = { job: ModelJob; setting: keyof JobOverride; why: string };

/** Drops saved settings the Worker would now refuse or ignore, and says which. `measured` are the matching Setups
 * that may still be picked. */
export function pruneSettings(settings: DevSettings, allowed: ModelsResponse, measured: { name: string; model: string }[]): { settings: DevSettings; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const jobs: DevSettings["jobs"] = {};
  for (const [job, override] of Object.entries(settings.jobs) as [ModelJob, JobOverride][]) {
    const defaults = allowed.jobs[job];
    if (!defaults) {
      jobs[job] = override; // the Worker doesn't know this job (yet): keep it, and the panel says so
      continue;
    }
    const kept: JobOverride = { ...override };
    const drop = (setting: keyof JobOverride, why: string) => {
      delete kept[setting];
      dropped.push({ job, setting, why });
    };
    if (job === "matching") for (const setting of Object.keys(kept) as (keyof JobOverride)[]) drop(setting, "matching runs its Setup as measured");
    if (kept.model !== undefined && !chatModels(allowed).some((m) => m.id === kept.model)) drop("model", `${kept.model} isn't allowed any more`);
    const model = allowed.models.find((m) => m.id === (kept.model ?? defaults.model));
    if (kept.maxTokens !== undefined && kept.maxTokens > defaults.maxTokens) drop("maxTokens", `above the cap of ${defaults.maxTokens}`);
    if (kept.temperature !== undefined && !model?.temperature) drop("temperature", `${model?.id ?? defaults.model} doesn't take one`);
    if (kept.reasoningEffort !== undefined && !model?.reasoning) drop("reasoningEffort", `${model?.id ?? defaults.model} takes none`);
    if (Object.keys(kept).length > 0) jobs[job] = kept;
  }
  const setupStillThere = settings.matchingSetup === null || measured.some((m) => m.name === settings.matchingSetup && allowed.models.some((a) => a.id === m.model));
  if (!setupStillThere) dropped.push({ job: "matching", setting: "model", why: "that Setup's model isn't allowed any more" });
  return { settings: { ...settings, jobs, matchingSetup: setupStillThere ? settings.matchingSetup : null }, dropped };
}

/** The gateway with the panel's settings filled in: a call's own model, cap, effort or temperature wins, so the
 * Matcher's Setup and the Matcher Report's choices stay as they are. */
export function withDevSettings(gateway: ModelGateway): ModelGateway {
  return {
    ...gateway,
    generate(request) {
      const { model, maxTokens, reasoningEffort, temperature } = overridesFor(request.job);
      return gateway.generate({
        ...request,
        model: request.model ?? model,
        maxTokens: request.maxTokens ?? maxTokens,
        reasoningEffort: request.reasoningEffort ?? reasoningEffort,
        temperature: request.temperature ?? temperature,
      });
    },
  };
}

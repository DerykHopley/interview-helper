// The Developer panel's settings (#17): the owner's own, kept in this browser's localStorage, not the Vault, since
// they aren't Candidate data. While developer mode is on, they fill in each model call's model, token cap, reasoning
// effort and temperature, and matching's Setup. Turned off, the config defaults apply again.
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { REASONING_EFFORTS, type ModelJob } from "../../shared/workerProtocol";
import type { ModelGateway } from "../model-gateway/ModelGateway";

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
export const jobName = (job: ModelJob) => PANEL_JOBS.find(([key]) => key === job)?.[1] ?? job;

const jobOverride = z.object({
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  reasoningEffort: z.enum(REASONING_EFFORTS).optional(),
  temperature: z.number().min(0).max(2).optional(),
});
export type JobOverride = z.infer<typeof jobOverride>;

const settingsSchema = z.object({
  on: z.boolean().default(false),
  jobs: z.record(z.string(), jobOverride).default({}),
  /** Matching's Setup, by its Matcher name: one the Matcher Report measured, or null for the config's. */
  matchingSetup: z.string().nullable().default(null),
});
export type DevSettings = z.infer<typeof settingsSchema>;

const KEY = "interview-helper.developer";
const OFF: DevSettings = { on: false, jobs: {}, matchingSetup: null };

function read(): DevSettings {
  try {
    const parsed = settingsSchema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    return parsed.success ? parsed.data : OFF;
  } catch {
    return OFF; // storage blocked, or not JSON
  }
}

let current: DevSettings | null = null;
const listeners = new Set<() => void>();

/** The settings, read once from localStorage and kept in step with every change. */
export const devSettings = {
  get: (): DevSettings => (current ??= read()),
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

export const useDevSettings = () => useSyncExternalStore(devSettings.subscribe, devSettings.get);

/** How many settings differ from the config defaults: each job's, and matching's Setup. */
export function overrideCount({ jobs, matchingSetup }: DevSettings) {
  const perJob = Object.values(jobs).reduce((n, o) => n + Object.values(o).filter((v) => v !== undefined).length, 0);
  return perJob + (matchingSetup ? 1 : 0);
}

/** The panel's settings for a job, while developer mode is on. */
export function overridesFor(job: ModelJob): JobOverride {
  const settings = devSettings.get();
  return settings.on ? (settings.jobs[job] ?? {}) : {};
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

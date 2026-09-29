// The contract between the app and the Worker, imported by both so the compiler catches a mismatch.
import { z } from "zod";

/** The LLM jobs the app runs; each maps to a configured model in the Worker. */
export const MODEL_JOBS = ["question-generation", "matching", "match-reasons", "co-writing"] as const;
export type ModelJob = (typeof MODEL_JOBS)[number];

/** Every error the Worker replies with, as `{ "error": <code> }`. */
export const WORKER_ERRORS = [
  "missing_token",
  "invalid_token",
  "expired_token",
  "worker_not_configured",
  "bad_request",
  "unknown_job",
  "model_not_allowed",
  "model_unavailable",
  "settings_not_allowed",
  "reply_cut_off",
  "invalid_model_reply",
  "internal_error",
] as const;
export type WorkerError = (typeof WORKER_ERRORS)[number];
export const isWorkerError = (code: unknown): code is WorkerError => (WORKER_ERRORS as readonly unknown[]).includes(code);

/** Why an Access Token was refused, and the error code the Worker sends for it. */
export type AccessRefusal = "invalid" | "expired";
export const ACCESS_REFUSAL_ERROR = { invalid: "invalid_token", expired: "expired_token" } as const satisfies Record<AccessRefusal, WorkerError>;

/** GET /v1/access → 200 */
export type AccessResponse = { label: string; expiresAt: string };

/** POST /v1/generate body. `schema` is the reply's JSON Schema; `model` may pick another allowed model, and
 * `maxTokens` a lower cap than the job's own. */
export const GenerateRequest = z.object({
  job: z.string(),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  system: z.string(),
  user: z.string(),
  schema: z.record(z.string(), z.unknown()),
});
export type GenerateRequest = z.infer<typeof GenerateRequest>;

/** POST /v1/generate → 200 */
export type GenerateResponse = { output: unknown };

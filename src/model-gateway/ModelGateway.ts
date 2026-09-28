import type { z } from "zod";

import type { AccessRefusal, ModelJob, WorkerError } from "../../shared/workerProtocol";

export type { ModelJob } from "../../shared/workerProtocol";

export type StructuredRequest<Schema extends z.ZodType> = {
  job: ModelJob;
  system: string;
  /** Untrusted text (Job Specs, Scenarios, typed Questions) goes here, delimited as data. */
  user: string;
  /**
   * Every reply must match this schema; a reply that doesn't is rejected with "invalid_model_reply". It's sent to the
   * model as strict structured output, so every field must be required: use `.nullable()`, not `.optional()`.
   */
  schema: Schema;
};

/** Jev's typed questions (OpenRouter's decisions endpoint). All questions in one request are answered in parallel. */
export type DecisionQuestion =
  | { type: "noul"; instructions: string; criteria?: { true: string; false: string } }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

export type DecisionAnswer =
  | { type: "noul"; noul: number /* 0 = no … 1 = yes */ }
  | { type: "choice"; choice: string; confidence?: number; probabilities?: Record<string, number> }
  | { type: "score"; score: number; confidence?: number; probabilities?: Record<string, number> };

export type DecisionRequest<Keys extends string> = {
  job: ModelJob;
  /** The untrusted content to evaluate. */
  state: string;
  questions: Record<Keys, DecisionQuestion>;
};

/** Whether an Access Token lets the app use LLM features right now. */
export type AccessStatus = { ok: true; label: string; expiresAt: Date } | { ok: false; reason: AccessRefusal };

/** Why a model call failed, as the app can explain it to the Candidate: a Worker error, or one on the app's side. */
export type ModelGatewayErrorCode = WorkerError | "worker_unreachable" | "request_refused" | "not_connected";

export class ModelGatewayError extends Error {
  constructor(readonly code: ModelGatewayErrorCode) {
    super(`Model call failed: ${code}`);
    this.name = "ModelGatewayError";
  }
}

/**
 * The single way the app reaches any model (spec #1, "Modules"). Remote calls go through the Worker; an
 * in-browser embedding model sits behind the same interface. It is the only thing faked in app-level tests.
 */
export interface ModelGateway {
  generate<Schema extends z.ZodType>(request: StructuredRequest<Schema>): Promise<z.infer<Schema>>;
  embed(texts: string[]): Promise<number[][]>;
  /** Classify/score with Jev: typed answers only, no free text. */
  decide<Keys extends string>(request: DecisionRequest<Keys>): Promise<Record<Keys, DecisionAnswer>>;
  /** Checks an Access Token with the Worker, before it's used. */
  checkAccess(token: string): Promise<AccessStatus>;
}

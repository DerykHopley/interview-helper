import type { z } from "zod";

import type { AccessRefusal, ChatTurn, ModelJob, ReasoningEffort, WorkerError } from "../../shared/workerProtocol";

export type { ChatTurn, ModelJob } from "../../shared/workerProtocol";

export type StructuredRequest<Schema extends z.ZodType> = {
  job: ModelJob;
  /** A model other than the job's default in the Worker; it must be on the Worker's allowed list. */
  model?: string;
  /** A reasoning effort other than the job's default in the Worker. */
  reasoningEffort?: ReasoningEffort;
  system: string;
  /** A chat's earlier turns (co-writing), sent as real user and assistant roles before `user`. */
  messages?: ChatTurn[];
  /** Untrusted text (Job Specs, Scenarios, typed Questions) goes here, delimited as data. In a chat, the newest turn. */
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
  /** A spoken Answer as text (#33), by a speech model running in this browser: no audio leaves the device. The first use
   * downloads the model; `onDownload` reports how much of it has arrived (0 to 1). */
  transcribe(audio: Blob, onDownload?: (fraction: number) => void): Promise<string>;
  /** Whether the speech model is already in this browser, so a first use can say what it will download. */
  transcriberDownloaded(): Promise<boolean>;
}

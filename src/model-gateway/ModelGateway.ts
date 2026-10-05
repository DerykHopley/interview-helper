import type { z } from "zod";

import type { AccessRefusal, CallTokens, ChatTurn, DecisionAnswer, DecisionJob, DecisionQuestion, ModelJob, ModelsResponse, ReasoningEffort, WorkerError } from "../../shared/workerProtocol";

export type { AllowedModel, ChatTurn, DecisionAnswer, DecisionJob, DecisionQuestion, ModelJob, ModelsResponse } from "../../shared/workerProtocol";

export type StructuredRequest<Schema extends z.ZodType> = {
  job: ModelJob;
  /** A model other than the job's default in the Worker; it must be on the Worker's allowed list. */
  model?: string;
  /** A reasoning effort other than the job's default in the Worker. */
  reasoningEffort?: ReasoningEffort;
  /** A lower token cap than the job's own in the Worker, which is a ceiling. */
  maxTokens?: number;
  /** A temperature (0–2), for a model that takes one. */
  temperature?: number;
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

/** Typed questions for Jev. All questions in one request are answered in parallel, in one call. */
export type DecisionRequest<Keys extends string> = {
  job: DecisionJob;
  /** A decision model other than the job's default in the Worker; it must be on the Worker's DECISION_MODELS. */
  model?: string;
  /** The untrusted content to evaluate. */
  state: string;
  questions: Record<Keys, DecisionQuestion>;
};

/** One model call the Worker answered: which model ran, what it cost (US$) and its tokens (each null if OpenRouter
 * didn't say), how long it took and when. Never the prompt or reply. */
export type ModelCall = { job: ModelJob | DecisionJob; model: string; cost: number | null; tokens: CallTokens | null; durationMs: number; at: Date; failed?: WorkerError };

/** Whether an Access Token lets the app use LLM features right now. */
export type AccessStatus = { ok: true; label: string; expiresAt: Date } | { ok: false; reason: AccessRefusal };

/** Why a model call failed, as the app can explain it to the Candidate: a Worker error, or one on the app's side. */
export type ModelGatewayErrorCode = WorkerError | "worker_unreachable" | "request_refused" | "not_connected";

export class ModelGatewayError extends Error {
  constructor(
    readonly code: ModelGatewayErrorCode,
    /** For a call OpenRouter billed though it failed: which model ran, and what it cost. */
    readonly billed?: { model: string; cost: number | null; tokens: CallTokens | null },
  ) {
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
  /** Classify/score with Jev: typed answers only, no free text. An answer missing, of another type than asked, or
   * outside what was asked is refused with "invalid_model_reply". */
  decide<Keys extends string>(request: DecisionRequest<Keys>): Promise<Record<Keys, DecisionAnswer>>;
  /** Checks an Access Token with the Worker, before it's used. */
  checkAccess(token: string): Promise<AccessStatus>;
  /** The models the Worker allows, with their live prices and settings, and each job's defaults and caps (#17). */
  allowedModels(): Promise<ModelsResponse>;
  /** Tells `listener` about each model call from now on, until the returned function is called (#17). */
  onCall(listener: (call: ModelCall) => void): () => void;
  /** A spoken Answer as text (#33), by a speech model running in this browser: no audio leaves the device. The first use
   * downloads the model; `onDownload` reports how much of it has arrived (0 to 1). */
  transcribe(audio: Blob, onDownload?: (fraction: number) => void): Promise<string>;
  /** Whether the speech model is already in this browser, so a first use can say what it will download. */
  transcriberDownloaded(): Promise<boolean>;
  /** Starts getting the speech model ready (downloading it the first time), e.g. while the Candidate records.
   * `onDownload` reports progress as for `transcribe`. */
  prepareTranscriber(onDownload?: (fraction: number) => void): Promise<void>;
}

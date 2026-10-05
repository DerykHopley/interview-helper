// The contract between the app and the Worker, imported by both so the compiler catches a mismatch.
import { z } from "zod";

/** The LLM jobs the app runs; each maps to a configured model in the Worker. */
export const MODEL_JOBS = ["question-generation", "matching", "match-reasons", "co-writing", "feedback", "readiness-report", "reason-judging"] as const;
export type ModelJob = (typeof MODEL_JOBS)[number];

/** The decision jobs (#20): typed answers from a decision model (Jev), never text. Each maps to a model in the
 * Worker's DECISION_JOBS, apart from the chat jobs, so neither kind of call can reach the other kind of model. */
export const DECISION_JOBS = ["jev-matching"] as const;
export type DecisionJob = (typeof DECISION_JOBS)[number];

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

/** The reasoning efforts a request may pick (OpenRouter's, less the costliest). */
export const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/** One earlier turn of a chat (co-writing, #12). Bounded, so a long chat can't run up the cost. */
export const ChatTurn = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) });
export type ChatTurn = z.infer<typeof ChatTurn>;

/** POST /v1/generate body. `schema` is the reply's JSON Schema; `model` may pick another allowed model, `maxTokens`
 * a lower cap than the job's own (the cap is a ceiling), `reasoningEffort` another allowed effort, and `temperature` one
 * for a model that takes it (the Developer panel, #17). `messages` are a chat's earlier turns, sent between `system`
 * and `user` (the newest message). */
export const GenerateRequest = z.object({
  job: z.string(),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  reasoningEffort: z.enum(REASONING_EFFORTS).optional(),
  temperature: z.number().min(0).max(2).optional(),
  system: z.string(),
  messages: z.array(ChatTurn).max(40).optional(),
  user: z.string(),
  schema: z.record(z.string(), z.unknown()),
})
  // In a chat, the newest message is bounded like the turns before it.
  .refine((r) => !r.messages || r.user.length <= 4000);
export type GenerateRequest = z.infer<typeof GenerateRequest>;

/** POST /v1/generate → 200. `model` is the one that ran, `cost` what OpenRouter charged in USD and `tokens` what the
 * call used (each null if it didn't say), for the Matcher Report and the Developer panel. */
export type GenerateResponse = { output: unknown; model: string; cost: number | null; tokens: CallTokens | null };
export type CallTokens = { input: number; output: number };

/** A /v1/generate error for a call OpenRouter still billed (a reply cut off, or one that couldn't be read): what it
 * cost comes back with the error, so the Developer panel's total is what was spent (#17). */
export type BilledError = { error: WorkerError; model: string; cost: number | null; tokens: CallTokens | null };

// Scenarios have no length limit of their own; Jev's context (32k tokens) is the real one, and OpenRouter refuses beyond it.
const decisionText = z.string().trim().min(1).max(20_000);

/** One of Jev's typed questions (OpenRouter's decisions endpoint, #20). `criteria` describe the answers: Jev never sees
 * the keys, so each description must carry its whole meaning. */
export const DecisionQuestion = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), instructions: decisionText, criteria: z.object({ true: decisionText, false: decisionText }).optional() }),
  z.object({
    type: z.literal("choice"),
    instructions: decisionText,
    criteria: z.record(z.string(), decisionText).refine((options) => Object.keys(options).length >= 2 && Object.keys(options).length <= 60),
  }),
  z.object({ type: z.literal("score"), instructions: decisionText, criteria: z.array(decisionText).min(2).max(10) }),
]);
export type DecisionQuestion = z.infer<typeof DecisionQuestion>;

/** POST /v1/decide body: `state` is the untrusted content to evaluate, and `questions` are answered in parallel, by
 * key. `model` may pick another allowed decision model. */
export const DecideRequest = z.object({
  job: z.string(),
  model: z.string().optional(),
  state: decisionText,
  questions: z.record(z.string().regex(/^\w{1,40}$/), DecisionQuestion).refine((questions) => Object.keys(questions).length >= 1 && Object.keys(questions).length <= 60),
});
export type DecideRequest = z.infer<typeof DecideRequest>;

/** POST /v1/decide → 200: the answers by question key, as Jev gave them (the gateway checks them), with the model that
 * ran, its cost and tokens as for /v1/generate. Jev's output tokens are free. */
export type DecideResponse = { answers: Record<string, unknown>; model: string; cost: number | null; tokens: CallTokens | null };

/** One allowed model, as the Developer panel (#17) shows it: its live price in US$ per million tokens and whether it
 * takes a temperature or a reasoning effort, from OpenRouter's models endpoint (null and false if that's unknown).
 * A "decision" model (Jev, #20) answers /v1/decide only, never a chat job. */
export type AllowedModel = { id: string; kind: "chat" | "decision"; price: { inputPerMillion: number; outputPerMillion: number } | null; temperature: boolean; reasoning: boolean };

/** GET /v1/models → 200: the allowed models, and each job's default model and limits (the token cap is a ceiling).
 * `pricesAt` is when the prices were fetched, or null if OpenRouter's models endpoint couldn't be read. */
export type ModelsResponse = {
  models: AllowedModel[];
  jobs: Record<string, { model: string; maxTokens: number; reasoningEffort: ReasoningEffort }>;
  pricesAt: string | null;
};

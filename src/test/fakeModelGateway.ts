import type { AccessStatus, ChatTurn, DecisionAnswer, ModelCall, ModelGateway, ModelJob, ModelsResponse } from "../model-gateway/ModelGateway";

/** What the Worker allows, as `GET /v1/models` answers (#17): its allowed models, and each job's defaults and caps. */
export const ALLOWED: ModelsResponse = {
  models: [
    { id: "openai/gpt-5-mini", price: { inputPerMillion: 0.25, outputPerMillion: 2 }, temperature: false, reasoning: true },
    { id: "openai/gpt-5-nano", price: { inputPerMillion: 0.05, outputPerMillion: 0.4 }, temperature: false, reasoning: true },
    { id: "openai/gpt-5.4", price: { inputPerMillion: 2.5, outputPerMillion: 15 }, temperature: false, reasoning: true },
    { id: "anthropic/claude-haiku-4.5", price: { inputPerMillion: 1, outputPerMillion: 5 }, temperature: true, reasoning: true },
    { id: "openai/gpt-4o-mini", price: { inputPerMillion: 0.15, outputPerMillion: 0.6 }, temperature: true, reasoning: false },
  ],
  jobs: {
    "question-generation": { model: "openai/gpt-5-mini", maxTokens: 4000, reasoningEffort: "low" },
    matching: { model: "openai/gpt-5-mini", maxTokens: 6000, reasoningEffort: "low" },
    "match-reasons": { model: "openai/gpt-5-mini", maxTokens: 2000, reasoningEffort: "low" },
    "co-writing": { model: "openai/gpt-5-mini", maxTokens: 4000, reasoningEffort: "low" },
    feedback: { model: "openai/gpt-5-mini", maxTokens: 3000, reasoningEffort: "low" },
    "readiness-report": { model: "openai/gpt-5-mini", maxTokens: 8000, reasoningEffort: "medium" },
    "reason-judging": { model: "google/gemini-3.8-flash", maxTokens: 3000, reasoningEffort: "low" },
  },
  pricesAt: "2026-10-02T09:00:00.000Z",
};

/** What each faked call reports using: a fixed token count, and `callCost` (US$). */
const CALL_TOKENS = { input: 1000, output: 200 };

/** Makes a reply from the request, e.g. to answer about the Scenarios it sent, or a promise of one. */
export type ReplyFor = (request: { job: ModelJob; system: string; messages?: ChatTurn[]; user: string }) => unknown;
/** Per job, the replies in order: each a scripted value, or a ReplyFor function. */
type Script = Partial<Record<ModelJob, unknown[]>>;
type DecisionScript = Partial<Record<ModelJob, Record<string, DecisionAnswer>[]>>;

/** A fake Model Gateway that can also say which Access Token a real one would send with its next call. */
export type FakeModelGateway = ModelGateway & {
  /** Given by the app, as the Worker gateway is (see `CreateGateway`). */
  connect(getAccessToken: () => string | null): void;
  accessTokenToSend(): string | null;
};

/**
 * A Model Gateway with scripted replies, per job, in order. Generated replies still go through the request's
 * schema, so a scripted reply that doesn't match is rejected just like a real one. Unscripted calls fail loudly.
 */
export function createFakeModelGateway({
  generate = {},
  decide = {},
  embeddings = [],
  accessTokens = {},
  transcripts = [],
  transcriberDownloaded: downloadedAtStart = false,
  allowed = ALLOWED,
  callCost = 0.001,
}: {
  generate?: Script;
  decide?: DecisionScript;
  embeddings?: number[][];
  /** How the Worker would answer for each token; any other token is invalid. */
  accessTokens?: Record<string, AccessStatus>;
  /** What each transcription returns, in order: the text, or an error to fail with. */
  transcripts?: (string | Error)[];
  /** Whether the speech model is already in this browser; the first transcription downloads it otherwise. */
  transcriberDownloaded?: boolean;
  /** What the Worker says it allows (#17), or an error to fail with. */
  allowed?: ModelsResponse | Error;
  /** What each call reports it cost, in US$ (#17). */
  callCost?: number;
} = {}): FakeModelGateway {
  const queuedTranscripts = [...transcripts];
  let downloaded = downloadedAtStart;
  const queues = Object.fromEntries(Object.entries(generate).map(([job, replies]) => [job, [...replies]])) as Script;
  const decisions = structuredClone(decide);
  let getAccessToken = (): string | null => null;
  const listeners = new Set<(call: ModelCall) => void>();
  const allowedJobs = allowed instanceof Error ? ALLOWED.jobs : allowed.jobs;
  return {
    connect(source) {
      getAccessToken = source;
    },
    accessTokenToSend: () => getAccessToken(),
    generate(request) {
      const scripted = queues[request.job]?.shift();
      const next: unknown = typeof scripted === "function" ? (scripted as ReplyFor)(request) : scripted;
      if (next === undefined) return Promise.reject(new Error(`No scripted reply for job "${request.job}"`));
      // A ReplyFor may return a promise, to hold a reply back until the test releases it. Like the Worker's gateway,
      // every reply that arrives is reported as a call, before its schema check.
      const at = new Date();
      return Promise.resolve(next).then((value) => {
        const model = request.model ?? allowedJobs[request.job]?.model ?? "openai/gpt-5-mini";
        for (const listener of listeners) listener({ job: request.job, model, cost: callCost, tokens: CALL_TOKENS, ms: Date.now() - at.getTime(), at });
        return request.schema.parse(value);
      });
    },
    allowedModels: () => (allowed instanceof Error ? Promise.reject(allowed) : Promise.resolve(structuredClone(allowed))),
    onCall(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    embed(texts) {
      if (embeddings.length < texts.length) return Promise.reject(new Error("Not enough scripted embeddings"));
      return Promise.resolve(embeddings.splice(0, texts.length));
    },
    transcribe(_audio, onDownload) {
      const next = queuedTranscripts.shift();
      if (next === undefined) return Promise.reject(new Error("No scripted transcript"));
      if (!downloaded) {
        onDownload?.(0.5);
        onDownload?.(1);
        downloaded = true;
      }
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    },
    transcriberDownloaded: () => Promise.resolve(downloaded),
    prepareTranscriber: () => Promise.resolve(),
    checkAccess(token) {
      return Promise.resolve(accessTokens[token.trim()] ?? { ok: false, reason: "invalid" });
    },
    decide<Keys extends string>(request: { job: ModelJob; questions: Record<Keys, unknown> }) {
      const next = decisions[request.job]?.shift();
      if (!next) return Promise.reject(new Error(`No scripted decision for job "${request.job}"`));
      const missing = Object.keys(request.questions).filter((key) => !(key in next));
      if (missing.length) return Promise.reject(new Error(`Scripted decision has no answer for: ${missing.join(", ")}`));
      return Promise.resolve(next as Record<Keys, DecisionAnswer>);
    },
  };
}

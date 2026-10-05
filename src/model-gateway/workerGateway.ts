import { z } from "zod";
import { DecisionAnswer, isWorkerError, type AccessResponse, type BilledError, type DecideRequest, type DecideResponse, type DecisionQuestion, type GenerateRequest, type GenerateResponse, type ModelsResponse } from "../../shared/workerProtocol";
import { ModelGatewayError, type AccessStatus, type DecisionRequest, type ModelCall, type ModelGateway } from "./ModelGateway";

type Options = {
  /** Where the Worker runs, e.g. http://localhost:8787 in local dev. */
  baseUrl: string;
  /** The Candidate's current Access Token, if any. */
  getAccessToken: () => string | null;
  fetch?: typeof globalThis.fetch;
  /** Told about every model call the Worker answered: which model ran and what it cost. The Matcher Report (#14)
   * totals it; the Developer panel (#17) listens with the gateway's own `onCall`. */
  onCall?: (call: ModelCall) => void;
  /** Speech to text, which runs in the browser rather than through the Worker (#33). Without it, transcribing is
   * refused ("not_connected"), as in the Worker's own tests. */
  speech?: Pick<ModelGateway, "transcribe" | "transcriberDownloaded" | "prepareTranscriber">;
};

export type { ModelCall } from "./ModelGateway";

/** The reply schema as the JSON Schema OpenRouter's strict structured outputs expect: no `$schema` key. */
function toStrictJsonSchema(schema: z.ZodType) {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema);
  delete jsonSchema.$schema;
  return jsonSchema;
}

/** Jev's answer to `question`, if it's of the type asked and within it (a choice, and any probabilities, only among the
 * options given); else null. Fields beyond the contract's are dropped. */
function answerTo(question: DecisionQuestion, answer: unknown): DecisionAnswer | null {
  const parsed = DecisionAnswer.safeParse(answer);
  if (!parsed.success || parsed.data.type !== question.type) return null;
  if (parsed.data.type === "noul" || question.type === "noul") return parsed.data;
  const options = Object.keys(question.criteria);
  const { choice, probabilities = {} } = parsed.data;
  return options.includes(choice) && Object.keys(probabilities).every((option) => options.includes(option)) ? parsed.data : null;
}

/** The real Model Gateway: reaches models through the Worker, which checks the Access Token and calls OpenRouter. */
export function createWorkerGateway({ baseUrl, getAccessToken, fetch = globalThis.fetch.bind(globalThis), onCall, speech }: Options): ModelGateway {
  const listeners = new Set<(call: ModelCall) => void>(onCall ? [onCall] : []);
  const call = async (path: string, init: RequestInit, token = getAccessToken()) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    } catch {
      throw new ModelGatewayError("worker_unreachable"); // offline, DNS, CORS refused, Worker down
    }
    if (response.ok) return (await response.json()) as unknown;
    const body = (await response.json().catch(() => ({}))) as Partial<BilledError> & { error?: string };
    const billed = typeof body.model === "string" && body.cost !== undefined ? { model: body.model, cost: body.cost, tokens: body.tokens ?? null } : undefined;
    throw new ModelGatewayError(isWorkerError(body.error) ? body.error : response.status >= 500 ? "model_unavailable" : "request_refused", billed);
  };

  /** Reports a call to everyone listening, and returns how to report one that failed but was billed. */
  const reporter = (job: ModelCall["job"]) => {
    const at = new Date();
    return (call: Omit<ModelCall, "job" | "durationMs" | "at">) => {
      for (const listener of listeners) listener({ job, ...call, durationMs: Date.now() - at.getTime(), at });
    };
  };
  /** Posts to the Worker; a billed failure is reported, with why, before it's thrown. */
  const post = async <Reply>(path: string, body: unknown, report: ReturnType<typeof reporter>) => {
    try {
      return (await call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })) as Reply;
    } catch (e) {
      if (e instanceof ModelGatewayError && e.billed && isWorkerError(e.code)) report({ ...e.billed, failed: e.code }); // billed though it failed
      throw e;
    }
  };

  return {
    async generate({ job, model: requested, reasoningEffort, maxTokens, temperature, system, messages, user, schema }) {
      const body: GenerateRequest = {
        job,
        ...(requested && { model: requested }),
        ...(reasoningEffort && { reasoningEffort }),
        ...(maxTokens !== undefined && { maxTokens }),
        ...(temperature !== undefined && { temperature }),
        system,
        ...(messages && { messages }),
        user,
        schema: toStrictJsonSchema(schema),
      };
      const report = reporter(job);
      const { output, model, cost, tokens } = await post<GenerateResponse>("/v1/generate", body, report);
      report({ model, cost, tokens: tokens ?? null }); // before the schema check: a reply that fails it was still paid for
      const parsed = schema.safeParse(output);
      if (!parsed.success) throw new ModelGatewayError("invalid_model_reply");
      return parsed.data;
    },

    async checkAccess(token): Promise<AccessStatus> {
      try {
        const { label, expiresAt } = (await call("/v1/access", { method: "GET" }, token)) as AccessResponse;
        return { ok: true, label, expiresAt: new Date(expiresAt) };
      } catch (e) {
        if (e instanceof ModelGatewayError && e.code === "expired_token") return { ok: false, reason: "expired" };
        if (e instanceof ModelGatewayError && (e.code === "invalid_token" || e.code === "missing_token")) return { ok: false, reason: "invalid" };
        throw e;
      }
    },

    allowedModels: async () => (await call("/v1/models", { method: "GET" })) as ModelsResponse,

    onCall(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    async decide<Keys extends string>({ job, model: requested, state, questions }: DecisionRequest<Keys>) {
      const report = reporter(job);
      const body: DecideRequest = { job, ...(requested && { model: requested }), state, questions };
      const { answers, model, cost, tokens } = await post<DecideResponse>("/v1/decide", body, report);
      report({ model, cost, tokens: tokens ?? null }); // before the answers are checked: a reply that fails was still paid for
      const checked = (Object.keys(questions) as Keys[]).map((key) => [key, answerTo(questions[key], answers[key])] as const);
      if (checked.some(([, answer]) => answer === null)) throw new ModelGatewayError("invalid_model_reply");
      return Object.fromEntries(checked) as Record<Keys, DecisionAnswer>;
    },

    // Remote embeddings reach the Worker in a later ticket (#21).
    embed: () => Promise.reject(new ModelGatewayError("not_connected")),
    transcribe: (audio, onDownload) => (speech ? speech.transcribe(audio, onDownload) : Promise.reject(new ModelGatewayError("not_connected"))),
    transcriberDownloaded: () => (speech ? speech.transcriberDownloaded() : Promise.resolve(false)),
    prepareTranscriber: (onDownload) => (speech ? speech.prepareTranscriber(onDownload) : Promise.reject(new ModelGatewayError("not_connected"))),
  };
}

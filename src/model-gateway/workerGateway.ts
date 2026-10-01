import { z } from "zod";
import { isWorkerError, type AccessResponse, type GenerateRequest, type GenerateResponse } from "../../shared/workerProtocol";
import { ModelGatewayError, type AccessStatus, type ModelGateway, type ModelJob } from "./ModelGateway";

type Options = {
  /** Where the Worker runs, e.g. http://localhost:8787 in local dev. */
  baseUrl: string;
  /** The Candidate's current Access Token, if any. */
  getAccessToken: () => string | null;
  fetch?: typeof globalThis.fetch;
  /** Told about every model call the Worker answered: which model ran and what it cost. The Matcher Report (#14)
   * totals it, and the Developer panel (#17) can show it. */
  onCall?: (call: ModelCall) => void;
  /** Speech to text, which runs in the browser rather than through the Worker (#33). Without it, voice isn't offered. */
  speech?: Pick<ModelGateway, "transcribe" | "transcriberDownloaded">;
};

export type ModelCall = { job: ModelJob; model: string; cost: number | null };

/** The reply schema as the JSON Schema OpenRouter's strict structured outputs expect: no `$schema` key. */
function toStrictJsonSchema(schema: z.ZodType) {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema);
  delete jsonSchema.$schema;
  return jsonSchema;
}

/** The real Model Gateway: reaches models through the Worker, which checks the Access Token and calls OpenRouter. */
export function createWorkerGateway({ baseUrl, getAccessToken, fetch = globalThis.fetch.bind(globalThis), onCall, speech }: Options): ModelGateway {
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
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ModelGatewayError(isWorkerError(error) ? error : response.status >= 500 ? "model_unavailable" : "request_refused");
  };

  return {
    async generate({ job, model: requested, reasoningEffort, system, messages, user, schema }) {
      const body: GenerateRequest = {
        job,
        ...(requested && { model: requested }),
        ...(reasoningEffort && { reasoningEffort }),
        system,
        ...(messages && { messages }),
        user,
        schema: toStrictJsonSchema(schema),
      };
      const { output, model, cost } = (await call("/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })) as GenerateResponse;
      onCall?.({ job, model, cost }); // before the schema check: a reply that fails it was still paid for
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

    // Embeddings and Jev decisions reach the Worker in later tickets (#10, #20, #21).
    embed: () => Promise.reject(new ModelGatewayError("not_connected")),
    transcribe: (audio, onDownload) => (speech ? speech.transcribe(audio, onDownload) : Promise.reject(new ModelGatewayError("not_connected"))),
    transcriberDownloaded: () => (speech ? speech.transcriberDownloaded() : Promise.resolve(false)),
    decide: () => Promise.reject(new ModelGatewayError("not_connected")),
  };
}

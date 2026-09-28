import { z } from "zod";
import { ModelGatewayError, type AccessStatus, type ModelGateway, type ModelGatewayErrorCode } from "./ModelGateway";

type Options = {
  /** Where the Worker runs, e.g. http://localhost:8787 in local dev. */
  baseUrl: string;
  /** The Candidate's current Access Token, if any. */
  getAccessToken: () => string | null;
  fetch?: typeof globalThis.fetch;
};

const KNOWN_ERRORS: ModelGatewayErrorCode[] = ["missing_token", "invalid_token", "expired_token", "model_unavailable", "invalid_model_reply"];

/** The real Model Gateway: reaches models through the Worker, which checks the Access Token and calls OpenRouter. */
export function createWorkerGateway({ baseUrl, getAccessToken, fetch = globalThis.fetch.bind(globalThis) }: Options): ModelGateway {
  const call = async (path: string, init: RequestInit, token = getAccessToken()) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (response.ok) return (await response.json()) as unknown;
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ModelGatewayError(KNOWN_ERRORS.find((code) => code === error) ?? (response.status >= 500 ? "model_unavailable" : "request_refused"));
  };

  return {
    async generate({ job, system, user, schema }) {
      const { output } = (await call("/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, system, user, schema: z.toJSONSchema(schema) }),
      })) as { output: unknown };
      const parsed = schema.safeParse(output);
      if (!parsed.success) throw new ModelGatewayError("invalid_model_reply");
      return parsed.data;
    },

    async checkAccess(token): Promise<AccessStatus> {
      try {
        const { label, expiresAt } = (await call("/v1/access", { method: "GET" }, token)) as { label: string; expiresAt: string };
        return { ok: true, label, expiresAt: new Date(expiresAt) };
      } catch (e) {
        if (e instanceof ModelGatewayError && e.code === "expired_token") return { ok: false, reason: "expired" };
        if (e instanceof ModelGatewayError && (e.code === "invalid_token" || e.code === "missing_token")) return { ok: false, reason: "invalid" };
        throw e;
      }
    },

    // Embeddings and Jev decisions reach the Worker in later tickets (#10, #20, #21).
    embed: () => Promise.reject(new ModelGatewayError("not_connected")),
    decide: () => Promise.reject(new ModelGatewayError("not_connected")),
  };
}

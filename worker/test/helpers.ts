import { env, exports } from "cloudflare:workers";
import { mintAccessToken } from "../src/accessToken";

export const validToken = () => mintAccessToken({ label: "cohort1", expiresAt: new Date("2099-01-01"), secret: env.ACCESS_TOKEN_SECRET });

export const QUESTIONS_SCHEMA = {
  type: "object",
  properties: { questions: { type: "array", items: { type: "string" } } },
  required: ["questions"],
  additionalProperties: false,
};

export async function generate(body: Record<string, unknown>, token?: string) {
  return exports.default.fetch("http://worker.test/v1/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? (await validToken())}` },
    body: JSON.stringify(body),
  });
}

/** A chat-completions reply as OpenRouter sends it, with usage accounting (cost in US$). */
export const completion = (content: string, cost = 0.00123) =>
  Response.json({ id: "gen-1", choices: [{ message: { role: "assistant", content } }], usage: { prompt_tokens: 120, completion_tokens: 40, cost } });

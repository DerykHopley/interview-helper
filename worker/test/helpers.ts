import { env, exports } from "cloudflare:workers";
import { mintAccessToken } from "../src/accessToken";

/** A token that expires in `hours` (whole seconds, as tokens carry). */
export const inHours = (hours: number) => new Date(Math.floor((Date.now() + hours * 3_600_000) / 1000) * 1000);

export const validToken = () => mintAccessToken({ label: "cohort1", expiresAt: inHours(2), secret: env.ACCESS_TOKEN_SECRET });

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

export async function decide(body: Record<string, unknown>, token?: string) {
  return exports.default.fetch("http://worker.test/v1/decide", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? (await validToken())}` },
    body: JSON.stringify(body),
  });
}

/** A decisions reply as OpenRouter sends it for Jev (#20): typed answers by question key, and usage (cost in US$). */
export const decisions = (answers: Record<string, unknown>, cost = 0.00002) => Response.json({ answers, usage: { prompt_tokens: 480, completion_tokens: 0, cost } });

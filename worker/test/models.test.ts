import { exports } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import type { ModelsResponse } from "../../shared/workerProtocol";
import { fakeOpenRouter } from "./fakeOpenRouter";
import { validToken } from "./helpers";

async function models(token?: string | null) {
  const headers: Record<string, string> = token === null ? {} : { Authorization: `Bearer ${token ?? (await validToken())}` };
  return exports.default.fetch("http://worker.test/v1/models", { headers });
}

/** OpenRouter's models endpoint, as it answers: prices in US$ per token, as strings. */
const OPENROUTER_MODELS = {
  data: [
    { id: "openai/gpt-5-mini", pricing: { prompt: "0.00000025", completion: "0.000002" }, supported_parameters: ["max_tokens", "reasoning", "response_format"] },
    { id: "anthropic/claude-haiku-4.5", pricing: { prompt: "0.000001", completion: "0.000005" }, supported_parameters: ["max_tokens", "temperature", "reasoning"] },
    { id: "typesafe/jev-1.13", pricing: { prompt: "0.000000042", completion: "0" }, supported_parameters: [] },
    { id: "some/model-not-allowed", pricing: { prompt: "0.1", completion: "0.1" }, supported_parameters: ["temperature"] },
  ],
};

describe("what the Worker allows (the Developer panel, #17)", () => {
  let openRouter: ReturnType<typeof fakeOpenRouter>;
  afterEach(() => openRouter.restore());

  it("lists each allowed model with its live price and settings, and each job's defaults and caps", async () => {
    openRouter = fakeOpenRouter(() => Response.json(OPENROUTER_MODELS));

    const response = await models();

    expect(response.status).toBe(200);
    const body = await response.json<ModelsResponse>();
    expect(openRouter.requests[0].url).toBe("https://openrouter.ai/api/v1/models");
    expect(body.models.find((m) => m.id === "openai/gpt-5-mini")).toEqual({ id: "openai/gpt-5-mini", kind: "chat", price: { inputPerMillion: 0.25, outputPerMillion: 2 }, temperature: false, reasoning: true });
    expect(body.models.find((m) => m.id === "anthropic/claude-haiku-4.5")).toEqual({ id: "anthropic/claude-haiku-4.5", kind: "chat", price: { inputPerMillion: 1, outputPerMillion: 5 }, temperature: true, reasoning: true });
    // Only the allowed list, every one of it, whether OpenRouter knows it or not.
    expect(body.models.map((m) => m.id)).not.toContain("some/model-not-allowed");
    expect(body.models.find((m) => m.id === "openai/gpt-5-nano")).toEqual({ id: "openai/gpt-5-nano", kind: "chat", price: null, temperature: false, reasoning: false });
    // Jev (#20) is a decision model: listed with its input price, so the panel can offer a measured Jev Setup, but never
    // for a chat job.
    expect(body.models.find((m) => m.id === "typesafe/jev-1.13")).toEqual({ id: "typesafe/jev-1.13", kind: "decision", price: { inputPerMillion: 0.042, outputPerMillion: 0 }, temperature: false, reasoning: false });
    expect(body.jobs["feedback"]).toEqual({ model: "openai/gpt-5-mini", maxTokens: 3000, reasoningEffort: "low" });
    expect(body.jobs["readiness-report"]).toEqual({ model: "openai/gpt-5-mini", maxTokens: 8000, reasoningEffort: "medium" });
    expect(body.decisionJobs).toEqual({ "jev-matching": { model: "typesafe/jev-1.13" } });
    expect(typeof body.pricesAt).toBe("string");
  });

  it("still answers, without prices, when OpenRouter's models endpoint fails", async () => {
    openRouter = fakeOpenRouter(() => new Response("down", { status: 503 }));

    const body = await (await models()).json<ModelsResponse>();

    expect(body.models.every((m) => m.price === null && m.temperature === false)).toBe(true);
    expect(body.pricesAt).toBeNull();
  });

  it("needs an Access Token", async () => {
    openRouter = fakeOpenRouter();
    expect((await models(null)).status).toBe(401);
    expect(openRouter.requests).toHaveLength(0);
  });
});

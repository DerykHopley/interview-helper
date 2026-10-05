// The app's HTTP client for the Worker (the real Model Gateway), run against the real Worker. Covers the contract
// between app and Worker: URLs, JSON shapes, the token header and how errors reach the app. Only OpenRouter is faked.
import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createLlmMatcher } from "../../src/matching/llmMatcher";
import { PROMPT_VARIANTS } from "../../src/matching/promptVariants";
import { createWorkerGateway } from "../../src/model-gateway/workerGateway";
import { mintAccessToken } from "../src/accessToken";
import { fakeOpenRouter } from "./fakeOpenRouter";
import { completion, decisions, inHours } from "./helpers";

const gatewayWith = (token: string | null) =>
  createWorkerGateway({ baseUrl: "http://worker.test", getAccessToken: () => token, fetch: (input, init) => exports.default.fetch(input, init) });
const mint = (expiresAt: Date, secret = env.ACCESS_TOKEN_SECRET) => mintAccessToken({ label: "cohort1", expiresAt, secret });
const Questions = z.object({ questions: z.array(z.string()) });

describe("the app's Model Gateway, talking to the Worker", () => {
  let openRouter: ReturnType<typeof fakeOpenRouter> | undefined;
  afterEach(() => openRouter?.restore());

  it("reports whether an Access Token is active, invalid or expired", async () => {
    const gateway = gatewayWith(null);

    const expiresAt = inHours(8);
    expect(await gateway.checkAccess(await mint(expiresAt))).toEqual({ ok: true, label: "cohort1", expiresAt });
    expect(await gateway.checkAccess(await mint(new Date("2020-01-01")))).toEqual({ ok: false, reason: "expired" });
    expect(await gateway.checkAccess("IH-NOPE-123-456")).toEqual({ ok: false, reason: "invalid" });
  });

  it("returns a reply checked against the request's schema, which it sends to the model as JSON Schema", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":["Tell me about a time you led a team."]}'));
    const gateway = gatewayWith(await mint(inHours(2)));

    const reply = await gateway.generate({ job: "question-generation", system: "s", user: "u", schema: Questions });

    expect(reply).toEqual({ questions: ["Tell me about a time you led a team."] });
    const sent = openRouter.requests[0].json() as { response_format: { json_schema: { schema: unknown } } };
    expect(sent.response_format.json_schema.schema).toEqual({
      type: "object",
      properties: { questions: { type: "array", items: { type: "string" } } },
      required: ["questions"],
      additionalProperties: false,
    });
  });

  it("tells an onCall listener which model ran and what each call cost, even when the reply fails its schema", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":["Q"]}', 0.0021));
    const calls: unknown[] = [];
    const token = await mint(inHours(2));
    const gateway = createWorkerGateway({
      baseUrl: "http://worker.test",
      getAccessToken: () => token,
      fetch: (input, init) => exports.default.fetch(input, init),
      onCall: (call) => calls.push(call),
    });

    await gateway.generate({ job: "matching", system: "s", user: "u", schema: Questions });
    await expect(gateway.generate({ job: "matching", system: "s", user: "u", schema: z.object({ other: z.string() }) })).rejects.toMatchObject({
      code: "invalid_model_reply",
    });

    const reported = expect.objectContaining({ job: "matching", model: "openai/gpt-5-mini", cost: 0.0021, tokens: { input: 120, output: 40 } }) as unknown;
    expect(calls).toEqual([reported, reported]);
    for (const call of calls as { durationMs: unknown; at: unknown }[]) {
      expect(typeof call.durationMs).toBe("number");
      expect(call.at).toBeInstanceOf(Date);
    }
  });

  it("reports each call to anyone listening, until they stop (the Developer panel's Calls, #17)", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":["Q"]}', 0.0021));
    const gateway = gatewayWith(await mint(inHours(2)));
    const heard: unknown[] = [];
    const stop = gateway.onCall((call) => heard.push(call));

    await gateway.generate({ job: "feedback", system: "s", user: "u", schema: Questions });
    stop();
    await gateway.generate({ job: "feedback", system: "s", user: "u", schema: Questions });

    expect(heard).toEqual([expect.objectContaining({ job: "feedback", cost: 0.0021, tokens: { input: 120, output: 40 } })]);
  });

  it("reports a call that was billed but failed, with why, so the Developer panel's total is what was spent", async () => {
    openRouter = fakeOpenRouter(() => Response.json({ id: "gen-1", choices: [{ finish_reason: "length", message: { role: "assistant", content: "" } }], usage: { cost: 0.002 } }));
    const gateway = gatewayWith(await mint(inHours(2)));
    const heard: { failed?: string; cost: number | null }[] = [];
    gateway.onCall((call) => heard.push(call));

    await expect(gateway.generate({ job: "matching", system: "s", user: "u", schema: Questions })).rejects.toMatchObject({ code: "reply_cut_off" });

    expect(heard).toEqual([expect.objectContaining({ job: "matching", cost: 0.002, failed: "reply_cut_off" })]);
  });

  it("asks the Worker for the token cap and temperature a request names", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":[]}'));
    const gateway = gatewayWith(await mint(inHours(2)));

    await gateway.generate({ job: "feedback", model: "anthropic/claude-haiku-4.5", maxTokens: 1500, temperature: 0.7, system: "s", user: "u", schema: Questions });

    expect(openRouter.requests[0].json()).toMatchObject({ model: "anthropic/claude-haiku-4.5", max_tokens: 1500, temperature: 0.7 });
  });

  it("asks the Worker which models it allows, with their prices, and each job's limits", async () => {
    openRouter = fakeOpenRouter(() => Response.json({ data: [{ id: "openai/gpt-5-mini", pricing: { prompt: "0.00000025", completion: "0.000002" }, supported_parameters: ["reasoning"] }] }));
    const gateway = gatewayWith(await mint(inHours(2)));

    const allowed = await gateway.allowedModels();

    expect(allowed.models).toContainEqual({ id: "openai/gpt-5-mini", kind: "chat", price: { inputPerMillion: 0.25, outputPerMillion: 2 }, temperature: false, reasoning: true });
    expect(allowed.jobs["co-writing"]).toEqual({ model: "openai/gpt-5-mini", maxTokens: 4000, reasoningEffort: "low" });
  });

  it("asks the Worker for the model a request names", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":[]}'));
    const gateway = gatewayWith(await mint(inHours(2)));

    await gateway.generate({ job: "matching", model: "openai/gpt-5-nano", system: "s", user: "u", schema: Questions });

    expect(openRouter.requests[0].json()).toMatchObject({ model: "openai/gpt-5-nano" });
  });

  it("asks the Worker for the reasoning effort a request names", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":[]}'));
    const gateway = gatewayWith(await mint(inHours(2)));

    await gateway.generate({ job: "matching", reasoningEffort: "minimal", system: "s", user: "u", schema: Questions });

    expect(openRouter.requests[0].json()).toMatchObject({ reasoning: { effort: "minimal" } });
  });

  it("sends a chat's earlier turns, so the model sees real user and assistant roles", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":[]}'));
    const gateway = gatewayWith(await mint(inHours(2)));

    const messages = [
      { role: "user" as const, content: "A Scenario about a migration" },
      { role: "assistant" as const, content: '{"message":"What was your role?"}' },
    ];
    await gateway.generate({ job: "co-writing", system: "s", messages, user: "Tech lead", schema: Questions });

    expect(openRouter.requests[0].json()).toMatchObject({ messages: [{ role: "system", content: "s" }, ...messages, { role: "user", content: "Tech lead" }] });
  });

  it("sends the LLM Matcher's reply schema with notes first, so a Prompt Variant can reason before it scores", async () => {
    openRouter = fakeOpenRouter(() => completion('{"notes":"","scores":[{"id":"S1","score":80}]}'));
    const gateway = gatewayWith(await mint(inHours(2)));
    const scenario = { id: "a", title: "T", role: "R", skills: ["s"], situation: "S", task: "T", action: "A", result: "R", measurableResults: [] };

    await createLlmMatcher(gateway, PROMPT_VARIANTS["chain-of-thought"], { model: "openai/gpt-5-mini", reasoningEffort: "low" }).rank({ text: "Q" }, [scenario]);

    const sent = openRouter.requests[0].json() as { response_format: { json_schema: { schema: { properties: object; required: string[] } } } };
    expect(Object.keys(sent.response_format.json_schema.schema.properties)).toEqual(["notes", "scores"]);
    expect(sent.response_format.json_schema.schema.required).toEqual(["notes", "scores"]);
  });

  it("rejects a reply that doesn't match the schema", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":"not a list"}'));
    const gateway = gatewayWith(await mint(inHours(2)));

    await expect(gateway.generate({ job: "question-generation", system: "s", user: "u", schema: Questions })).rejects.toMatchObject({ code: "invalid_model_reply" });
  });

  it("asks Jev typed questions through the Worker, and reports the call (#20)", async () => {
    openRouter = fakeOpenRouter(() => decisions({ s1: { type: "noul", noul: 0.9 }, best: { type: "choice", choice: "S1", confidence: 0.6, probabilities: { S1: 0.7, none: 0.3 } } }, 0.00002));
    const gateway = gatewayWith(await mint(inHours(2)));
    const heard: unknown[] = [];
    gateway.onCall((call) => heard.push(call));

    const answers = await gateway.decide({
      job: "jev-matching",
      state: "Question",
      questions: { s1: { type: "noul", instructions: "Does it?" }, best: { type: "choice", instructions: "Which?", criteria: { S1: "One", none: "None" } } },
    });

    expect(answers).toEqual({ s1: { type: "noul", noul: 0.9 }, best: { type: "choice", choice: "S1", confidence: 0.6, probabilities: { S1: 0.7, none: 0.3 } } });
    expect(openRouter.requests[0].json()).toMatchObject({ model: "typesafe/jev-1.13", state: "Question" });
    expect(heard).toEqual([expect.objectContaining({ job: "jev-matching", model: "typesafe/jev-1.13", cost: 0.00002, tokens: { input: 480, output: 0 } })]);
  });

  it.each([
    ["leaves a question unanswered", { s1: { type: "noul", noul: 0.9 } }],
    ["answers with another type", { s1: { type: "noul", noul: 0.9 }, best: { type: "noul", noul: 0.2 } }],
    ["gives a probability outside 0 to 1", { s1: { type: "noul", noul: 1.4 }, best: { type: "choice", choice: "S1" } }],
    ["picks an option it wasn't given", { s1: { type: "noul", noul: 0.5 }, best: { type: "choice", choice: "S9" } }],
    ["gives a probability to an option it wasn't given", { s1: { type: "noul", noul: 0.5 }, best: { type: "choice", choice: "S1", probabilities: { S1: 0.6, S9: 0.4 } } }],
  ])("rejects a decision that %s, after reporting what it cost", async (_, answers) => {
    openRouter = fakeOpenRouter(() => decisions(answers));
    const gateway = gatewayWith(await mint(inHours(2)));
    const heard: unknown[] = [];
    gateway.onCall((call) => heard.push(call));

    const asked = gateway.decide({
      job: "jev-matching",
      state: "Question",
      questions: { s1: { type: "noul", instructions: "Does it?" }, best: { type: "choice", instructions: "Which?", criteria: { S1: "One", none: "None" } } },
    });

    await expect(asked).rejects.toMatchObject({ code: "invalid_model_reply" });
    expect(heard).toHaveLength(1);
  });

  it("tells the app when its Access Token has expired", async () => {
    openRouter = fakeOpenRouter();
    const gateway = gatewayWith(await mint(new Date("2020-01-01")));

    await expect(gateway.generate({ job: "question-generation", system: "s", user: "u", schema: Questions })).rejects.toMatchObject({ code: "expired_token" });
    expect(openRouter.requests).toHaveLength(0);
  });

  it("tells the app when the Worker can't be reached at all", async () => {
    const gateway = createWorkerGateway({ baseUrl: "http://worker.test", getAccessToken: () => null, fetch: () => Promise.reject(new TypeError("Failed to fetch")) });

    await expect(gateway.checkAccess("IH-ANY-1-1")).rejects.toMatchObject({ code: "worker_unreachable" });
  });
});

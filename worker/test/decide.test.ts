import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeOpenRouter } from "./fakeOpenRouter";
import { completion, decide, decisions, generate, QUESTIONS_SCHEMA, validToken } from "./helpers";

const NOUL = { type: "noul", instructions: "Does this Scenario answer the Question?", criteria: { true: "It does.", false: "It doesn't." } };
const CHOICE = { type: "choice", instructions: "Which Scenario answers the Question best?", criteria: { S1: "Led a migration.", S2: "Ran a hiring loop.", none: "None of them." } };

describe("Jev decisions (#20)", () => {
  let openRouter: ReturnType<typeof fakeOpenRouter>;
  afterEach(() => openRouter.restore());

  it("forwards the state and typed questions to OpenRouter's decisions endpoint with the job's model and the privacy setting", async () => {
    openRouter = fakeOpenRouter(() => decisions({ s1: { type: "noul", noul: 0.91 }, best: { type: "choice", choice: "S1", confidence: 0.7, probabilities: { S1: 0.8, S2: 0.15, none: 0.05 } } }));

    const response = await decide({ job: "jev-matching", state: "Question: lead a migration", questions: { s1: NOUL, best: CHOICE } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      answers: { s1: { type: "noul", noul: 0.91 }, best: { type: "choice", choice: "S1", confidence: 0.7, probabilities: { S1: 0.8, S2: 0.15, none: 0.05 } } },
      model: "typesafe/jev-1.13",
      cost: 0.00002,
      tokens: { input: 480, output: 0 },
    });
    const [sent] = openRouter.requests;
    expect(sent.url).toBe("https://openrouter.ai/api/alpha/decisions");
    expect(sent.headers.get("Authorization")).toBe("Bearer test-openrouter-key");
    expect(sent.json()).toEqual({
      model: "typesafe/jev-1.13",
      state: "Question: lead a migration",
      questions: { s1: NOUL, best: CHOICE },
      provider: { data_collection: "deny" },
    });
  });

  it("refuses a chat model, so a decision never reaches chat completions", async () => {
    openRouter = fakeOpenRouter();

    const response = await decide({ job: "jev-matching", model: "openai/gpt-5-mini", state: "s", questions: { s1: NOUL } });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "model_not_allowed" });
    expect(openRouter.requests).toHaveLength(0);
  });

  it("refuses a chat job, and /v1/generate refuses Jev", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":[]}'));

    const chatJob = await decide({ job: "matching", state: "s", questions: { s1: NOUL } });
    const jevOnGenerate = await generate({ job: "matching", model: "typesafe/jev-1.13", system: "s", user: "u", schema: QUESTIONS_SCHEMA });
    const jevJobOnGenerate = await generate({ job: "jev-matching", system: "s", user: "u", schema: QUESTIONS_SCHEMA });

    expect(await chatJob.json()).toEqual({ error: "unknown_job" });
    expect(await jevOnGenerate.json()).toEqual({ error: "model_not_allowed" });
    expect(await jevJobOnGenerate.json()).toEqual({ error: "unknown_job" });
    expect(openRouter.requests).toHaveLength(0);
  });

  it.each([
    ["no questions", { state: "s", questions: {} }],
    ["an unknown question type", { state: "s", questions: { s1: { type: "essay", instructions: "Write." } } }],
    ["a choice with one option", { state: "s", questions: { best: { ...CHOICE, criteria: { S1: "Only one." } } } }],
    ["an empty state", { state: "", questions: { s1: NOUL } }],
    ["a question key that isn't a plain word", { state: "s", questions: { "s 1<": NOUL } }],
  ])("refuses %s, without calling OpenRouter", async (_, body) => {
    openRouter = fakeOpenRouter();

    const response = await decide({ job: "jev-matching", ...body });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "bad_request" });
    expect(openRouter.requests).toHaveLength(0);
  });

  it("reports an unavailable model when OpenRouter fails", async () => {
    openRouter = fakeOpenRouter(() => new Response("upstream error", { status: 503 }));

    const response = await decide({ job: "jev-matching", state: "s", questions: { s1: NOUL } });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "model_unavailable" });
  });

  it("reports an invalid reply, with what it cost, when the reply has no answers", async () => {
    openRouter = fakeOpenRouter(() => Response.json({ usage: { prompt_tokens: 480, cost: 0.00002 } }));

    const response = await decide({ job: "jev-matching", state: "s", questions: { s1: NOUL } });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "invalid_model_reply", model: "typesafe/jev-1.13", cost: 0.00002, tokens: { input: 480, output: 0 } });
  });

  it("logs only the token label, job, model and cost, never the state, the questions or the answers", async () => {
    openRouter = fakeOpenRouter(() => decisions({ s1: { type: "noul", noul: 0.5, note: "SECRET-ANSWER" } }, 0.00003));
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const token = await validToken();

    await decide({ job: "jev-matching", state: "SECRET-STATE", questions: { s1: { ...NOUL, instructions: "SECRET-QUESTION" } } }, token);

    const logged = spies.flatMap((spy) => spy.mock.calls.map((args) => args.map(String).join(" ")));
    spies.forEach((spy) => spy.mockRestore());
    expect(logged.map((line) => JSON.parse(line) as unknown)).toEqual([{ label: "cohort1", job: "jev-matching", model: "typesafe/jev-1.13", cost: 0.00003 }]);
    for (const secret of ["SECRET-STATE", "SECRET-QUESTION", "SECRET-ANSWER", token]) expect(logged.join("\n")).not.toContain(secret);
  });

  it("needs an Access Token", async () => {
    openRouter = fakeOpenRouter();

    const response = await decide({ job: "jev-matching", state: "s", questions: { s1: NOUL } }, "not-a-token");

    expect(response.status).toBe(401);
    expect(openRouter.requests).toHaveLength(0);
  });
});

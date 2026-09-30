import { exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeOpenRouter } from "./fakeOpenRouter";
import { generate, QUESTIONS_SCHEMA, validToken } from "./helpers";

const APP = "http://localhost:5173";

/** Everything the Worker writes to any console method during `run`. */
async function captureLogs(run: () => Promise<unknown>) {
  const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  try {
    await run();
    return spies.flatMap((spy) => spy.mock.calls.map((args) => args.map(String).join(" "))).join("\n");
  } finally {
    spies.forEach((spy) => spy.mockRestore());
  }
}

describe("bad input and bad replies", () => {
  let openRouter: ReturnType<typeof fakeOpenRouter>;
  beforeEach(() => (openRouter = fakeOpenRouter()));
  afterEach(() => openRouter.restore());

  it("refuses a body that isn't JSON, without its text reaching the logs, and the app can read why", async () => {
    let response!: Response;
    const logs = await captureLogs(async () => {
      response = await exports.default.fetch("http://worker.test/v1/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${await validToken()}`, Origin: APP },
        body: '{"job":"question-generation","user":"SECRET-JOB-SPEC-TEXT',
      });
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "bad_request" });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(APP);
    expect(logs).not.toContain("SECRET-JOB-SPEC-TEXT");
    expect(openRouter.requests).toHaveLength(0);
  });

  it("refuses a body whose fields have the wrong types", async () => {
    const response = await generate({ job: "question-generation", system: 42, user: ["u"], schema: "nope" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "bad_request" });
  });

  it("treats built-in property names as unknown jobs", async () => {
    const response = await generate({ job: "constructor", model: "openai/gpt-5-mini", system: "s", user: "u", schema: QUESTIONS_SCHEMA });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "unknown_job" });
  });

  it("reports an invalid reply when OpenRouter's body isn't JSON, without logging it", async () => {
    openRouter.restore();
    openRouter = fakeOpenRouter(() => new Response("SECRET-REPLY-TEXT <html>", { status: 200 }));
    let response!: Response;
    const logs = await captureLogs(async () => {
      response = await generate({ job: "question-generation", system: "s", user: "u", schema: QUESTIONS_SCHEMA });
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "invalid_model_reply" });
    expect(logs).not.toContain("SECRET-REPLY-TEXT");
  });

  it("still records who made a call that failed, with no cost", async () => {
    openRouter.restore();
    openRouter = fakeOpenRouter(() => new Response("upstream error", { status: 503 }));
    const logs = await captureLogs(() => generate({ job: "question-generation", system: "s", user: "u", schema: QUESTIONS_SCHEMA }));

    expect(logs.split("\n").map((line) => JSON.parse(line) as unknown)).toEqual([
      { label: "cohort1", job: "question-generation", model: "openai/gpt-5-mini", cost: null, upstream: { status: 503 } },
    ]);
  });

  it("records OpenRouter's code and message for a failed call, but not the error's metadata", async () => {
    openRouter.restore();
    openRouter = fakeOpenRouter(() =>
      Response.json({ error: { code: 403, message: "Your input was flagged", metadata: { flagged_input: "SECRET-JOB-SPEC-TEXT" } } }, { status: 403 }),
    );
    const logs = await captureLogs(() => generate({ job: "matching", system: "s", user: "SECRET-JOB-SPEC-TEXT", schema: QUESTIONS_SCHEMA }));

    expect(logs.split("\n").map((line) => JSON.parse(line) as unknown)).toEqual([
      { label: "cohort1", job: "matching", model: "openai/gpt-5-mini", cost: null, upstream: { status: 403, code: 403, message: "Your input was flagged" } },
    ]);
    expect(logs).not.toContain("SECRET-JOB-SPEC-TEXT");
  });

  it("records the error a reply ends in", async () => {
    openRouter.restore();
    openRouter = fakeOpenRouter(() =>
      Response.json({ id: "gen-1", choices: [{ finish_reason: "error", error: { code: 502, message: "Provider returned error" }, message: { role: "assistant", content: "" } }] }),
    );
    const logs = await captureLogs(() => generate({ job: "matching", system: "s", user: "u", schema: QUESTIONS_SCHEMA }));

    expect(logs.split("\n").map((line) => JSON.parse(line) as unknown)).toEqual([
      { label: "cohort1", job: "matching", model: "openai/gpt-5-mini", cost: null, upstream: { status: 200, code: 502, message: "Provider returned error" } },
    ]);
  });
});

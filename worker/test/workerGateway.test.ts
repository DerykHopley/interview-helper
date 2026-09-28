// The app's HTTP client for the Worker (the real Model Gateway), run against the real Worker. Covers the contract
// between app and Worker: URLs, JSON shapes, the token header and how errors reach the app. Only OpenRouter is faked.
import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createWorkerGateway } from "../../src/model-gateway/workerGateway";
import { mintAccessToken } from "../src/accessToken";
import { fakeOpenRouter } from "./fakeOpenRouter";
import { completion } from "./helpers";

const gatewayWith = (token: string | null) =>
  createWorkerGateway({ baseUrl: "http://worker.test", getAccessToken: () => token, fetch: (input, init) => exports.default.fetch(input, init) });
const mint = (expiresAt: string, secret = env.ACCESS_TOKEN_SECRET) => mintAccessToken({ label: "cohort1", expiresAt: new Date(expiresAt), secret });
const Questions = z.object({ questions: z.array(z.string()) });

describe("the app's Model Gateway, talking to the Worker", () => {
  let openRouter: ReturnType<typeof fakeOpenRouter> | undefined;
  afterEach(() => openRouter?.restore());

  it("reports whether an Access Token is active, invalid or expired", async () => {
    const gateway = gatewayWith(null);

    expect(await gateway.checkAccess(await mint("2099-01-01T08:00:00Z"))).toEqual({ ok: true, label: "cohort1", expiresAt: new Date("2099-01-01T08:00:00Z") });
    expect(await gateway.checkAccess(await mint("2020-01-01"))).toEqual({ ok: false, reason: "expired" });
    expect(await gateway.checkAccess("IH-NOPE-123-456")).toEqual({ ok: false, reason: "invalid" });
  });

  it("returns a reply checked against the request's schema, which it sends to the model as JSON Schema", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":["Tell me about a time you led a team."]}'));
    const gateway = gatewayWith(await mint("2099-01-01"));

    const reply = await gateway.generate({ job: "question-generation", system: "s", user: "u", schema: Questions });

    expect(reply).toEqual({ questions: ["Tell me about a time you led a team."] });
    expect(openRouter.requests[0].json()).toMatchObject({
      response_format: {
        json_schema: {
          schema: { type: "object", properties: { questions: { type: "array", items: { type: "string" } } }, required: ["questions"], additionalProperties: false },
        },
      },
    });
  });

  it("rejects a reply that doesn't match the schema", async () => {
    openRouter = fakeOpenRouter(() => completion('{"questions":"not a list"}'));
    const gateway = gatewayWith(await mint("2099-01-01"));

    await expect(gateway.generate({ job: "question-generation", system: "s", user: "u", schema: Questions })).rejects.toMatchObject({ code: "invalid_model_reply" });
  });

  it("tells the app when its Access Token has expired", async () => {
    openRouter = fakeOpenRouter();
    const gateway = gatewayWith(await mint("2020-01-01"));

    await expect(gateway.generate({ job: "question-generation", system: "s", user: "u", schema: Questions })).rejects.toMatchObject({ code: "expired_token" });
    expect(openRouter.requests).toHaveLength(0);
  });
});

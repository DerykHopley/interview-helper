import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mintAccessToken } from "../src/accessToken";
import { fakeOpenRouter } from "./fakeOpenRouter";

const checkAccess = (token?: string) =>
  exports.default.fetch("http://worker.test/v1/access", { headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe("Access Tokens", () => {
  let openRouter: ReturnType<typeof fakeOpenRouter>;
  beforeEach(() => (openRouter = fakeOpenRouter()));
  afterEach(() => openRouter.restore());

  it("rejects a request with no Access Token", async () => {
    const response = await checkAccess();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "missing_token" });
  });

  it("accepts a token signed with the Worker's secret, and reports its label and expiry", async () => {
    const expiresAt = new Date("2099-01-01T08:00:00Z");
    const token = await mintAccessToken({ label: "cohort1", expiresAt, secret: env.ACCESS_TOKEN_SECRET });

    const response = await checkAccess(token);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ label: "cohort1", expiresAt: "2099-01-01T08:00:00.000Z" });
  });

  it("rejects a token whose signature has been tampered with", async () => {
    const token = await mintAccessToken({ label: "cohort1", expiresAt: new Date("2099-01-01"), secret: env.ACCESS_TOKEN_SECRET });
    const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");

    const response = await checkAccess(tampered);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid_token" });
  });

  it("rejects a token that has expired", async () => {
    const token = await mintAccessToken({ label: "cohort1", expiresAt: new Date("2020-01-01"), secret: env.ACCESS_TOKEN_SECRET });

    const response = await checkAccess(token);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "expired_token" });
  });

  it("rejects a token signed with a previous secret, so rotating the secret invalidates every token", async () => {
    const token = await mintAccessToken({ label: "cohort1", expiresAt: new Date("2099-01-01"), secret: "the-old-secret" });

    const response = await checkAccess(token);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid_token" });
  });

  it("accepts a hand-typed token in lower case with confusable letters", async () => {
    const token = await mintAccessToken({ label: "cohort1", expiresAt: new Date("2099-01-01"), secret: env.ACCESS_TOKEN_SECRET });
    const typed = token.toLowerCase().replace(/0/g, "o").replace(/1(?=[^-]*$)/g, "l");

    const response = await checkAccess(typed);

    expect(response.status).toBe(200);
  });
});

import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { JEV_MODEL } from "../../src/matching/jevMatcher";
import { validToken } from "./helpers";

describe("a Worker missing its secrets", () => {
  it("refuses requests instead of checking tokens against an empty signing secret", async () => {
    // An incoming request, as the runtime hands it to the Worker. tsc needs this cast; ESLint's view of the
    // Workers types doesn't, hence the disable.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const request = new Request("http://worker.test/v1/access", { headers: { Authorization: `Bearer ${await validToken()}` } }) as Request<unknown, IncomingRequestCfProperties>;

    const response = await worker.fetch(request, { ...env, ACCESS_TOKEN_SECRET: "" });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "worker_not_configured" });
  });
});

describe("the Worker's decision models (#20)", () => {
  it("include the Jev model the app and the Matcher Report ask for", () => {
    expect(env.DECISION_MODELS).toContain(JEV_MODEL);
    expect(Object.values(env.DECISION_JOBS)).toContain(JEV_MODEL);
  });
});

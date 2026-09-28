import { exports } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { fakeOpenRouter } from "./fakeOpenRouter";

describe("the Worker", () => {
  let openRouter: ReturnType<typeof fakeOpenRouter>;
  afterEach(() => openRouter.restore());

  it("answers a health check without calling OpenRouter", async () => {
    openRouter = fakeOpenRouter();

    const response = await exports.default.fetch("http://worker.test/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(openRouter.requests).toHaveLength(0);
  });
});

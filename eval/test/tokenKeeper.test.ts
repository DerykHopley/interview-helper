import { describe, expect, it } from "vitest";
import { tokenKeeper } from "../src/tokenKeeper";

describe("keeping an Access Token fresh through a long report", () => {
  it("mints a new token once the current one is within the margin of expiring, and not before", async () => {
    let clock = 0;
    let minted = 0;
    const keeper = tokenKeeper({ mint: (expiresAt) => Promise.resolve(`token-${++minted}-${expiresAt.getTime()}`), lifetimeMs: 60_000, marginMs: 20_000, now: () => clock });

    await keeper.fresh();
    const first = keeper.current();
    clock = 30_000; // 30 s left: still fine
    await keeper.fresh();
    expect(keeper.current()).toBe(first);
    clock = 45_000; // 15 s left: within the margin
    await keeper.fresh();

    expect(keeper.current()).toBe("token-2-105000");
    expect(minted).toBe(2);
  });

  it("uses a token it was given as it is, never minting", async () => {
    const keeper = tokenKeeper({ given: "IH-GIVEN", mint: () => Promise.reject(new Error("mustn't mint")), lifetimeMs: 1, marginMs: 1, now: () => 1e12 });

    await keeper.fresh();

    expect(keeper.current()).toBe("IH-GIVEN");
  });
});

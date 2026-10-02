import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { devVarsValue, ensureDevVars } from "./devVars";

const KEY = "sk-or-v1-test-key-1234567890";
const fresh = () => join(mkdtempSync(join(tmpdir(), "devvars-")), ".dev.vars");

describe("the Worker's local secrets (npm run local, #63)", () => {
  it("creates worker/.dev.vars with the key asked for and a signing secret it makes up", async () => {
    const path = fresh();
    const said: string[] = [];

    const result = await ensureDevVars({ path, askForKey: () => Promise.resolve(KEY), say: (line) => said.push(line) });

    expect(result).toBe("created");
    const written = readFileSync(path, "utf8");
    expect(written).toContain(`OPENROUTER_API_KEY=${KEY}\n`);
    expect(written).toMatch(/^ACCESS_TOKEN_SECRET=[0-9a-f]{64}$/m);
    // The key is never echoed back.
    expect(said.join("\n")).not.toContain(KEY);
  });

  it("makes a different signing secret each time", async () => {
    const secretOf = async () => {
      const path = fresh();
      await ensureDevVars({ path, askForKey: () => Promise.resolve(KEY), say: () => {} });
      return /^ACCESS_TOKEN_SECRET=(.+)$/m.exec(readFileSync(path, "utf8"))?.[1];
    };
    expect(await secretOf()).not.toBe(await secretOf());
  });

  it("leaves an existing file as it is, without asking", async () => {
    const path = fresh();
    writeFileSync(path, "OPENROUTER_API_KEY=mine\nACCESS_TOKEN_SECRET=also-mine\n");
    let asked = false;

    const result = await ensureDevVars({ path, askForKey: () => ((asked = true), Promise.resolve(KEY)), say: () => {} });

    expect(result).toBe("kept");
    expect(asked).toBe(false);
    expect(readFileSync(path, "utf8")).toBe("OPENROUTER_API_KEY=mine\nACCESS_TOKEN_SECRET=also-mine\n");
  });

  it("fills in an example file copied but not filled in, keeping its comments", async () => {
    const path = fresh();
    writeFileSync(path, "# The Worker's secrets.\nOPENROUTER_API_KEY=\nACCESS_TOKEN_SECRET=\n");

    const result = await ensureDevVars({ path, askForKey: () => Promise.resolve(KEY), say: () => {} });

    expect(result).toBe("completed");
    const written = readFileSync(path, "utf8");
    expect(written).toContain("# The Worker's secrets.\n");
    expect(written).toContain(`OPENROUTER_API_KEY=${KEY}\n`);
    expect(written).toMatch(/^ACCESS_TOKEN_SECRET=[0-9a-f]{64}$/m);
  });

  it("adds only what's missing, without asking for a key it already has", async () => {
    const path = fresh();
    writeFileSync(path, "OPENROUTER_API_KEY=mine\n");
    let asked = false;

    const result = await ensureDevVars({ path, askForKey: () => ((asked = true), Promise.resolve(KEY)), say: () => {} });

    expect(result).toBe("completed");
    expect(asked).toBe(false);
    expect(readFileSync(path, "utf8")).toMatch(/^OPENROUTER_API_KEY=mine\nACCESS_TOKEN_SECRET=[0-9a-f]{64}\n$/);
  });

  it("writes nothing when no key is given", async () => {
    const path = fresh();

    await expect(ensureDevVars({ path, askForKey: () => Promise.resolve("  "), say: () => {} })).rejects.toThrow("No OpenRouter API key given");
    expect(existsSync(path)).toBe(false);
  });
});

describe("reading a value from worker/.dev.vars", () => {
  it("reads it from the file only, never from the environment", () => {
    const path = fresh();
    writeFileSync(path, 'ACCESS_TOKEN_SECRET="from-the-file"\n');
    process.env.ACCESS_TOKEN_SECRET = "from-the-shell";
    try {
      expect(devVarsValue(path, "ACCESS_TOKEN_SECRET")).toBe("from-the-file");
      expect(devVarsValue(path, "OPENROUTER_API_KEY")).toBeNull();
    } finally {
      delete process.env.ACCESS_TOKEN_SECRET;
    }
  });
});

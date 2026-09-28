// Mints an Access Token for a group (spec #1, story 1–4). Run by the owner, never shipped:
//   npm run token -- --label cohort1 [--hours 8]      (labels: letters and digits; at most 168 hours)
// The signing secret must match the Worker's ACCESS_TOKEN_SECRET: set it in the environment, or it's read from
// worker/.dev.vars for local dev. Rotating the Worker's secret invalidates every token minted before.
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { MAX_LIFETIME_HOURS, mintAccessToken } from "../worker/src/accessToken";

const { values } = parseArgs({ options: { label: { type: "string" }, hours: { type: "string", default: "8" } } });

function readSecret() {
  if (process.env.ACCESS_TOKEN_SECRET) return process.env.ACCESS_TOKEN_SECRET;
  const devVars = new URL("../worker/.dev.vars", import.meta.url);
  if (existsSync(devVars)) {
    const line = readFileSync(devVars, "utf8").split("\n").find((l) => l.startsWith("ACCESS_TOKEN_SECRET="));
    const value = line?.slice("ACCESS_TOKEN_SECRET=".length).trim().replace(/^"|"$/g, "");
    if (value) return value;
  }
  throw new Error("No signing secret: set ACCESS_TOKEN_SECRET, or add it to worker/.dev.vars");
}

function fail(message: string): never {
  console.error(`Couldn't mint a token: ${message}`);
  process.exit(1);
}

const hours = Number(values.hours);
if (!values.label) fail("give the group a label, e.g. --label cohort1");
if (!(hours > 0) || hours > MAX_LIFETIME_HOURS) fail(`--hours must be between 0 and ${MAX_LIFETIME_HOURS} (7 days)`);

try {
  const expiresAt = new Date(Date.now() + hours * 3_600_000);
  const token = await mintAccessToken({ label: values.label, expiresAt, secret: readSecret() });
  console.log(token);
  console.error(`Label ${values.label}, expires ${expiresAt.toISOString()} (${hours} h)`);
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

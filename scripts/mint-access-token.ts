// Mints an Access Token for a group (spec #1, story 1–4). Run by the owner, never shipped:
//   npm run token -- --label cohort1 [--hours 8]      (labels: letters and digits; at most 168 hours)
// The signing secret must match the Worker's ACCESS_TOKEN_SECRET: set it in the environment, or it's read from
// worker/.dev.vars for local dev. Rotating the Worker's secret invalidates every token minted before.
import { parseArgs } from "node:util";
import { MAX_LIFETIME_HOURS } from "../worker/src/accessToken";
import { readSigningSecret } from "./signingSecret";
import { mintFor } from "./tokens";

const { values } = parseArgs({ options: { label: { type: "string" }, hours: { type: "string", default: "8" } } });

function fail(message: string): never {
  console.error(`Couldn't mint a token: ${message}`);
  process.exit(1);
}

const hours = Number(values.hours);
if (!values.label) fail("give the group a label, e.g. --label cohort1");
if (!(hours > 0) || hours > MAX_LIFETIME_HOURS) fail(`--hours must be between 0 and ${MAX_LIFETIME_HOURS} (7 days)`);

try {
  const { token, expiresAt } = await mintFor(values.label, hours, readSigningSecret());
  console.log(token);
  console.error(`Label ${values.label}, expires ${expiresAt.toISOString()} (${hours} h)`);
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

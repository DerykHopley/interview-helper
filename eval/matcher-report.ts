// The Matcher Report (spec #1, #14): run by hand only, never in CI. Needs the Worker running (`npm run dev:worker`).
//   npm run eval [-- --set eval/sets/fixture] [--runs 3]
// Scores the shipped Matcher against the Evaluation Set through the local Worker, several runs pooled (models don't
// score the same way twice), writes a dated report to eval/reports/ and records the measured Gap threshold in
// src/matching/gapThresholds.json. It spends real money: about a cent and a half per run with gpt-5-mini.
// Uses ACCESS_TOKEN if set, else mints a one-hour token labelled "eval" (the signing secret comes from the
// environment or worker/.dev.vars, as for `npm run token`).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { MATCHERS, MATCHING_CONFIG } from "../src/matching/matchingConfig";
import { createWorkerGateway } from "../src/model-gateway/workerGateway";
import { mintAccessToken } from "../worker/src/accessToken";
import { readSigningSecret } from "../scripts/signingSecret";
import { loadEvaluationSet } from "./src/evaluationSet";
import type { RecordedThresholds } from "../src/matching/matchingConfig";
import { withThreshold } from "./src/gapThresholds";
import { renderReport } from "./src/report";
import { runMatcher } from "./src/run";
import { scoreRuns } from "./src/scoring";

const { values } = parseArgs({ options: { set: { type: "string", default: "eval/sets/fixture" }, runs: { type: "string", default: "3" } } });
const runCount = Number(values.runs);
if (!Number.isInteger(runCount) || runCount < 1) {
  console.error("--runs must be a whole number, 1 or more");
  process.exit(1);
}
const workerUrl = process.env.WORKER_URL ?? "http://localhost:8787";
const THRESHOLDS = "src/matching/gapThresholds.json";

const token =
  process.env.ACCESS_TOKEN ?? (await mintAccessToken({ label: "eval", expiresAt: new Date(Date.now() + 3_600_000), secret: readSigningSecret() }));
let spent = 0;
const models = new Set<string>();
const gateway = createWorkerGateway({
  baseUrl: workerUrl,
  getAccessToken: () => token,
  onCall: ({ model, cost }) => {
    models.add(model);
    spent += cost ?? 0;
  },
});

const access = await gateway.checkAccess(token).catch(() => null);
if (!access?.ok) {
  console.error(access ? `The Worker refused the token (${access.reason}).` : `Couldn't reach the Worker at ${workerUrl}. Is \`npm run dev:worker\` running?`);
  process.exit(1);
}

const set = loadEvaluationSet(values.set);
const matcher = MATCHERS[MATCHING_CONFIG.matcher].create(gateway, MATCHING_CONFIG);
const runs = [];
for (let n = 1; n <= runCount; n++) {
  console.error(`Run ${n}/${runCount}: ${matcher.name} on ${set.questions.length} Questions and ${set.adversarial.length} adversarial cases…`);
  runs.push(await runMatcher({ matcher, set, now: () => performance.now(), spent: () => spent }));
}
const score = scoreRuns(runs, set.questions);

const date = new Date().toISOString().slice(0, 10);
let path = `eval/reports/${date}-matcher-report.md`;
for (let n = 2; existsSync(path); n++) path = `eval/reports/${date}-matcher-report-${n}.md`;
writeFileSync(path, renderReport({ date, setName: values.set, set, shipped: matcher.name, results: [{ score, models: [...models] }] }));
const recorded = JSON.parse(readFileSync(THRESHOLDS, "utf8")) as RecordedThresholds;
writeFileSync(THRESHOLDS, `${JSON.stringify(withThreshold(recorded, matcher.name, score.gapThreshold, path), null, 2)}\n`);

console.error(`Top-1 ${score.top1.correct}/${score.top1.of}, top-3 ${score.top3.correct}/${score.top3.of}, Gaps ${score.gaps.flagged}/${score.gaps.gapQuestions}, false alarms ${score.gaps.falseAlarms}, failed ${score.failed.length}.`);
console.error(`Gap threshold ${score.gapThreshold}, recorded in ${THRESHOLDS}. Spent $${spent.toFixed(4)}. Report: ${path}`);

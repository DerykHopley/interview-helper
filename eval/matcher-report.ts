// The Matcher Report (spec #1, #14, #15): run by hand only, never in CI. Needs the Worker running (`npm run dev:worker`).
//   npm run eval [-- --set eval/sets/fixture] [--runs 3]    the shipped Setup
//   npm run eval -- --all-setups [--runs 3]                  also every Prompt Variant and reasoning effort (#15)
//   npm run eval -- --render eval/reports/<report>.json      the report again from its saved scores, with no calls
// Scores Matchers against the Evaluation Set through the local Worker, several runs pooled (models don't score the
// same way twice), writes a dated report and its raw scores, and records each Setup's measured Gap threshold in
// src/matching/gapThresholds.json. Reports on a set in eval/private/ stay in eval/private/reports/. It spends real
// money: about a cent and a half per run of the set with gpt-5-mini, so --all-setups with 3 runs is roughly 30–60
// cents. Uses ACCESS_TOKEN if set, else mints a one-hour token labelled "eval" (the signing secret comes from the
// environment or worker/.dev.vars, as for `npm run token`).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { MATCHERS, MATCHING_CONFIG, type MatcherSetup, type RecordedThresholds } from "../src/matching/matchingConfig";
import { createWorkerGateway } from "../src/model-gateway/workerGateway";
import { mintAccessToken } from "../worker/src/accessToken";
import { readSigningSecret } from "../scripts/signingSecret";
import { loadEvaluationSet } from "./src/evaluationSet";
import { withThreshold } from "./src/gapThresholds";
import { parseRawReport, type RawReport } from "./src/rawReport";
import { renderReport } from "./src/report";
import { reportPlan, reportsDirFor, shippedPlan } from "./src/reportPlan";
import { runMatcher } from "./src/run";
import { scoreRuns, type MatcherRun, type MatcherScore } from "./src/scoring";

const { values } = parseArgs({
  options: {
    set: { type: "string", default: "eval/sets/fixture" },
    runs: { type: "string", default: "3" },
    "all-setups": { type: "boolean", default: false },
    render: { type: "string" },
  },
});
const THRESHOLDS = "src/matching/gapThresholds.json";

/** Scores the saved runs and writes the Markdown report. */
function writeReport(raw: RawReport, reportPath: string) {
  const results = raw.results.map(({ runs, models }) => ({ score: scoreRuns(runs, raw.set.questions), models }));
  writeFileSync(reportPath, renderReport({ ...raw, results }));
  for (const { score } of results) {
    console.error(`${score.name}: top-1 ${score.top1.correct}/${score.top1.of}, false alarms ${score.gaps.falseAlarms}, margin ${score.margin ?? "–"}, threshold ${score.gapThreshold}.`);
  }
  console.error(`Report: ${reportPath}.`);
  return results.map((r) => r.score);
}

/** Records each Setup's measured threshold, pointing at the report that measured it. */
function recordThresholds(scores: MatcherScore[], reportPath: string) {
  let recorded = JSON.parse(readFileSync(THRESHOLDS, "utf8")) as RecordedThresholds;
  for (const score of scores) recorded = withThreshold(recorded, score.name, score.gapThreshold, reportPath);
  writeFileSync(THRESHOLDS, `${JSON.stringify(recorded, null, 2)}\n`);
  console.error(`Thresholds recorded in ${THRESHOLDS}.`);
}

// Rendering again changes only the report: an old report's thresholds mustn't overwrite newer ones.
if (values.render) {
  writeReport(parseRawReport(readFileSync(values.render, "utf8")), values.render.replace(/\.json$/, ".md"));
  process.exit(0);
}

const runCount = Number(values.runs);
if (!Number.isInteger(runCount) || runCount < 1) {
  console.error("--runs must be a whole number, 1 or more");
  process.exit(1);
}
const workerUrl = process.env.WORKER_URL ?? "http://localhost:8787";
const token =
  process.env.ACCESS_TOKEN ?? (await mintAccessToken({ label: "eval", expiresAt: new Date(Date.now() + 3_600_000), secret: readSigningSecret() }));
let spent = 0;
/** A gateway that notes which models answered into `models`, and adds up what was spent. */
const gatewayNoting = (models: Set<string>) =>
  createWorkerGateway({
    baseUrl: workerUrl,
    getAccessToken: () => token,
    onCall: ({ model, cost }) => {
      models.add(model);
      spent += cost ?? 0;
    },
  });

const access = await gatewayNoting(new Set()).checkAccess(token).catch(() => null);
if (!access?.ok) {
  console.error(access ? `The Worker refused the token (${access.reason}).` : `Couldn't reach the Worker at ${workerUrl}. Is \`npm run dev:worker\` running?`);
  process.exit(1);
}

const set = loadEvaluationSet(values.set);
const nameOf = (setup: MatcherSetup) => MATCHERS[MATCHING_CONFIG.matcher].create(gatewayNoting(new Set()), setup).name;
const plan = values["all-setups"] ? reportPlan(MATCHING_CONFIG) : shippedPlan(MATCHING_CONFIG);
const results: RawReport["results"] = [];
for (const [i, setup] of plan.setups.entries()) {
  const models = new Set<string>();
  const matcher = MATCHERS[MATCHING_CONFIG.matcher].create(gatewayNoting(models), setup);
  const runs: MatcherRun[] = [];
  for (let n = 1; n <= runCount; n++) {
    console.error(`Setup ${i + 1}/${plan.setups.length}, run ${n}/${runCount}: ${matcher.name}…`);
    runs.push(await runMatcher({ matcher, set, now: () => performance.now(), spent: () => spent }));
  }
  results.push({ name: matcher.name, models: [...models], runs });
}

const dir = reportsDirFor(values.set);
mkdirSync(dir, { recursive: true });
const date = new Date().toISOString().slice(0, 10);
let reportPath = `${dir}/${date}-matcher-report.md`;
for (let n = 2; existsSync(reportPath); n++) reportPath = `${dir}/${date}-matcher-report-${n}.md`;
const sections = plan.sections.map(({ title, intro, setups }) => ({ title, intro, names: setups.map(nameOf) }));
const raw: RawReport = { date, setName: values.set, set, shipped: nameOf(MATCHING_CONFIG), sections, results };
writeFileSync(reportPath.replace(/\.md$/, ".json"), `${JSON.stringify(raw, null, 2)}\n`);
recordThresholds(writeReport(raw, reportPath), reportPath);
console.error(`Spent $${spent.toFixed(4)}.`);

// The Matcher Report (spec #1, #14, #15): run by hand only, never in CI. Needs the Worker running (`npm run dev:worker`).
//   npm run eval [-- --set eval/sets/fixture] [--runs 3]    the shipped Setup
//   npm run eval -- --all-setups [--runs 3]                  also every Prompt Variant and reasoning effort (#15)
//   npm run eval -- --models [--runs 3]                      also the shipped Setup on each compared model (#18)
//   npm run eval -- --jev [--runs 3]                         also each way of asking Jev (#20); well under a cent a run
//   npm run eval -- --reasons                                also judge the Match reasons (#18); combines with the above
//   npm run eval -- --render eval/reports/<report>.json      the report again from its saved scores, with no calls
// Scores Matchers against the Evaluation Set through the local Worker, several runs pooled (models don't score the
// same way twice), writes a dated report and its raw scores, and records each Setup's measured Gap threshold in
// src/matching/gapThresholds.json. Reports on a set in eval/private/ stay in eval/private/reports/. It spends real
// money: about a cent and a half per run of the set with gpt-5-mini, so --all-setups with 3 runs is roughly 30–60
// cents. Uses ACCESS_TOKEN if set, else mints tokens labelled "eval", renewed through a long run (the signing secret
// comes from the environment or worker/.dev.vars, as for `npm run token`).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { createMatcher, matcherName, MATCHING_CONFIG, type RecordedThresholds } from "../src/matching/matchingConfig";
import { createWorkerGateway } from "../src/model-gateway/workerGateway";
import { mintAccessToken } from "../worker/src/accessToken";
import { readSigningSecret } from "../scripts/signingSecret";
import { loadEvaluationSet } from "./src/evaluationSet";
import { withThreshold } from "./src/gapThresholds";
import { parseRawReport, type RawReport } from "./src/rawReport";
import { renderReport } from "./src/report";
import { JUDGE, REASONS_MODELS, runCalibration, runReasons, scoreCalibration, scoreReasons } from "./src/reasons";
import { COMPARED_MODELS, reportPlan, reportsDirFor } from "./src/reportPlan";
import { runMatcher } from "./src/run";
import { tokenKeeper } from "./src/tokenKeeper";
import { scoreRuns, type MatcherRun, type MatcherScore } from "./src/scoring";

const { values } = parseArgs({
  options: {
    set: { type: "string", default: "eval/sets/fixture" },
    runs: { type: "string", default: "3" },
    "all-setups": { type: "boolean", default: false },
    models: { type: "boolean", default: false },
    reasons: { type: "boolean", default: false },
    jev: { type: "boolean", default: false },
    render: { type: "string" },
  },
});
const THRESHOLDS = "src/matching/gapThresholds.json";

/** Scores the saved runs and writes the Markdown report. */
function writeReport(raw: RawReport, reportPath: string) {
  const results = raw.results.map(({ runs, models }) => ({ score: scoreRuns(runs, raw.set.questions), models }));
  const reasons = raw.reasons && {
    judgeModel: raw.reasons.judgeModel,
    scores: raw.reasons.runs.map(scoreReasons),
    calibration: scoreCalibration(raw.reasons.calibration),
  };
  writeFileSync(reportPath, renderReport({ ...raw, results, reasons }));
  if (reasons) {
    for (const r of reasons.scores) console.error(`Reasons by ${r.model}: grounded ${r.grounded.correct}/${r.grounded.of}, answers ${r.answers.correct}/${r.answers.of}, form ${r.form.correct}/${r.form.of}.`);
    console.error(`Judge calibration: ${reasons.calibration.agreed}/${reasons.calibration.of}.`);
  }
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
// A run of every model takes over an hour, longer than one token lasts, so it's renewed before each run of the set.
const tokens = tokenKeeper({
  given: process.env.ACCESS_TOKEN,
  mint: (expiresAt) => mintAccessToken({ label: "eval", expiresAt, secret: readSigningSecret() }),
  lifetimeMs: 60 * 60_000,
  marginMs: 30 * 60_000, // longer than one run of the set on the slowest model (about 15 minutes)
});
await tokens.fresh();
let spent = 0;
/** A gateway that notes which models answered into `models`, and adds up what was spent. */
const gatewayNoting = (models: Set<string>) =>
  createWorkerGateway({
    baseUrl: workerUrl,
    getAccessToken: tokens.current,
    onCall: ({ model, cost }) => {
      models.add(model);
      spent += cost ?? 0;
    },
  });

const access = await gatewayNoting(new Set()).checkAccess(tokens.current()).catch(() => null);
if (!access?.ok) {
  console.error(access ? `The Worker refused the token (${access.reason}).` : `Couldn't reach the Worker at ${workerUrl}. Is \`npm run dev:worker\` running?`);
  process.exit(1);
}

const set = loadEvaluationSet(values.set);
const nameOf = matcherName;
const plan = reportPlan(MATCHING_CONFIG, { allSetups: values["all-setups"], models: values.models ? COMPARED_MODELS : [], jev: values.jev });
const results: RawReport["results"] = [];
for (const [i, setup] of plan.setups.entries()) {
  const models = new Set<string>();
  const matcher = createMatcher(gatewayNoting(models), setup);
  const runs: MatcherRun[] = [];
  for (let n = 1; n <= runCount; n++) {
    await tokens.fresh();
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
const shipped = nameOf(MATCHING_CONFIG);

// The reason judge grades the reasons for the shipped Setup's top three in its first run.
let reasons: RawReport["reasons"];
if (values.reasons) {
  const shippedRun = results.find((r) => r.name === shipped)!.runs[0];
  const gateway = gatewayNoting(new Set());
  console.error(`Judging Match reasons by ${REASONS_MODELS.join(", ")} with ${JUDGE.model}…`);
  await tokens.fresh();
  const runs = await runReasons({ gateway, set, shippedRun, reasonsModels: REASONS_MODELS, now: () => performance.now(), spent: () => spent });
  await tokens.fresh();
  const calibration = await runCalibration({ gateway, set, spent: () => spent });
  reasons = { judgeModel: JUDGE.model, runs, calibration };
}
const raw: RawReport = { date, setName: values.set, set, shipped, sections, results, reasons };
writeFileSync(reportPath.replace(/\.md$/, ".json"), `${JSON.stringify(raw, null, 2)}\n`);
recordThresholds(writeReport(raw, reportPath), reportPath);
console.error(`Spent $${spent.toFixed(4)}.`);

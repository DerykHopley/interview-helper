// The Matcher Report (spec #1): a dated Markdown file comparing Matchers on one Evaluation Set.
import { isGap, type EvaluationSet, type LabelledQuestion } from "./evaluationSet";
import type { CalibrationScore, ReasonsScore } from "./reasons";
import { rankScores, type MatcherScore, type Outcome } from "./scoring";

export type ReportResult = { score: MatcherScore; models: string[] };
/** A section of Setups (by Matcher name) side by side, best first. */
export type ReportSection = { title: string; intro: string; names: string[] };
/** The reason judge's results (#18): each reasons model's scores, and how the judge did on the calibration set. */
export type ReportReasons = { judgeModel: string; scores: ReasonsScore[]; calibration: CalibrationScore };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const ratio = ({ correct, of }: { correct: number; of: number }) => `${correct}/${of} (${of ? Math.round((correct / of) * 100) : 0}%)`;
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const dollars = (usd: number) => `$${usd.toFixed(4)}`;
/** Table cells are single-line and can't contain a bare pipe. */
const cell = (text: string) => text.replace(/\s+/g, " ").replace(/\|/g, "\\|");
const row = (cells: (string | number)[]) => `| ${cells.map((c) => cell(String(c))).join(" | ")} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => "---")), ...rows.map(row)].join("\n");

const labelText = ({ label }: LabelledQuestion) =>
  isGap(label) ? "Gap" : label.acceptable.length ? `${label.best} (or ${label.acceptable.join(", ")})` : label.best;
const outcomeText = (o: Outcome) => (o === "failed" ? "failed" : o.gap ? "Gap" : o.top);

function questionRows(score: MatcherScore, set: EvaluationSet) {
  return score.questions.map(({ questionId, outcomes, best, right }) => {
    const q = set.questions.find((x) => x.id === questionId)!;
    const range = !best ? "–" : best.min === best.max ? `${best.min}` : `${best.min}–${best.max}`;
    const mark = right === outcomes.length ? "✅" : right === 0 ? "❌" : "⚠️";
    return [q.id, q.text, labelText(q), outcomes.map(outcomeText).join(", "), range, `${mark} ${right}/${outcomes.length}`];
  });
}

const RESULT_TEXT = { resisted: "✅ resisted", changed: "⚠️ changed (noise)", affected: "❌ affected", failed: "failed" } as const;

/** Each Setup's metrics as a table: the summary's, and each section's. */
function metricsTable(results: ReportResult[]) {
  return table(
    ["Matcher", "Model", "Top-1", "Top-3", "Gap threshold", "Gaps flagged", "False alarms", "Margin", "Attacks resisted", "Cost / Question", "Median time", "Slowest", "Failed"],
    results.map(({ score, models }) => [
      score.name,
      models.join(", ") || "none",
      ratio(score.top1),
      ratio(score.top3),
      score.gapThreshold,
      `${score.gaps.flagged}/${score.gaps.gapQuestions}`,
      `${score.gaps.falseAlarms}/${score.gaps.matchQuestions}`,
      score.margin ?? "–",
      `${score.adversarial.filter((a) => a.result === "resisted" || a.result === "changed").length}/${score.adversarial.filter((a) => a.result !== "failed").length}`,
      dollars(score.costPerQuestion),
      seconds(score.ms.median),
      seconds(score.ms.max),
      score.failed.length,
    ]),
  );
}

/** The Match reasons section: each reasons model's rates, every reason that failed a check, and the judge's check. */
function reasonsSection({ judgeModel, scores, calibration }: ReportReasons, shipped: string) {
  const lines = [
    "## Match reasons",
    "",
    `Each reasons model wrote the Match reasons for the top three Scenarios that **${shipped}** picked on every real-Match Question (one run), and a judge (${judgeModel}) graded each one. **Grounded:** every fact in the reason is in that Scenario. **Answers:** it names the part of the Scenario that answers the Question. **Form:** one sentence of at most 25 words, speaking to the Candidate as "you", checked in code.`,
    "",
    table(
      ["Reasons model", "Grounded", "Answers the Question", "Form", "Cost / Question", "Judge cost / Question", "Median time", "Failed writing", "Failed judging"],
      scores.map((s) => [
        s.model,
        ratio(s.grounded),
        ratio(s.answers),
        ratio(s.form),
        dollars(s.costPerQuestion),
        s.judgeCostPerQuestion === null ? "not recorded" : dollars(s.judgeCostPerQuestion),
        seconds(s.medianMs),
        s.failedWriting,
        s.failedJudging,
      ]),
    ),
  ];
  lines.push(
    "",
    "By Match: the top Match's reasons apart from the 2nd and 3rd Matches'. A weaker Match often doesn't answer the Question, so its reason can't honestly say it does.",
    "",
    table(
      ["Reasons model", "Match", "Grounded", "Answers the Question", "Form"],
      scores.flatMap((s) =>
        (["top", "rest"] as const).map((k) => [s.model, k === "top" ? "Top Match" : "2nd and 3rd", ratio(s.byRank[k].grounded), ratio(s.byRank[k].answers), ratio(s.byRank[k].form)]),
      ),
    ),
  );
  const problems = scores.flatMap((s) => s.problems.map((p) => ({ ...p, model: s.model })));
  if (problems.length) {
    lines.push("", "### Reasons that failed a check", "");
    for (const p of problems) {
      const what = [!p.grounded && "not grounded", !p.answers && "doesn't answer the Question", ...p.form].filter(Boolean).join("; ");
      lines.push(`- \`${p.questionId}\` · \`${p.scenarioId}\`, Match ${p.rank} (${p.model}): ${what}${p.note ? `, ${p.note.replace(/\.$/, "")}` : ""}.`, `  > ${p.reason}`);
    }
  }
  lines.push("", "The reasons of a call that failed count as not passing, so failures can't flatter a model.");
  if (!calibration.of) return lines;
  lines.push(
    "",
    "### Checking the judge",
    "",
    `The judge (${calibration.judgeModel}) matched **${calibration.agreed} of ${calibration.of}** known verdicts. They're hand-written reasons in \`reason-calibration.yaml\`, some with a planted invention, so a lenient judge shows up here (${dollars(calibration.cost)}).`,
    ...(calibration.misses.length ? ["", ...calibration.misses.map((m) => `- \`${m.id}\`: wrong on ${m.wrong.join(" and ")}.`)] : []),
  );
  return lines;
}

/** `shipped` names the Matcher the app ships. With `sections`, the summary is the shipped Setup's alone, each section
 * puts its Setups side by side, and the other Setups' details are folded away. */
export function renderReport({
  date,
  setName,
  set,
  shipped,
  results,
  sections = [],
  reasons,
}: {
  date: string;
  setName: string;
  set: EvaluationSet;
  shipped: string;
  results: ReportResult[];
  sections?: ReportSection[];
  reasons?: ReportReasons;
}): string {
  const gaps = set.questions.filter((q) => isGap(q.label)).length;
  const runs = Math.max(...results.map((r) => r.score.runs), 1);
  const shippedScore = results.find((r) => r.score.name === shipped)?.score;
  const lines = [
    `# Matcher Report, ${date}`,
    "",
    `Evaluation Set \`${setName}\`: ${plural(set.scenarios.length, "Scenario")}, ${plural(set.questions.length, "Question")} (${plural(gaps, "Gap")}), ${plural(set.adversarial.length, "adversarial case")}. Each Matcher ran it ${runs === 1 ? "once" : `${runs} times`}.`,
    "",
    shippedScore
      ? `The app ships **${shipped}**, and its Gap threshold of ${shippedScore.gapThreshold} is recorded in \`src/matching/gapThresholds.json\`.`
      : `The app ships **${shipped}**, which this report didn't run, so its recorded threshold is unchanged.`,
    "",
    "## Summary",
    "",
    metricsTable(sections.length ? results.filter((r) => r.score.name === shipped) : results),
    "",
    "- **Top-1:** the top-ranked Scenario is the best or an acceptable one. **Top-3:** a correct Scenario is in the first three. Both count non-Gap Questions only, and use the ranking alone.",
    "- Every count is out of Questions × runs. Models don't score the same way twice, so each Question's **best score** is shown as a range across runs.",
    "- **Gap threshold:** a Question is a Gap if even its best score is below it. It's the cut-off that sorts the most results correctly into Gap or not, over every run together, chosen on this same Evaluation Set, so Gap detection here is optimistic.",
    "- **Margin:** the weakest real Match's best score minus the strongest Gap's, over every run: how cleanly a threshold can part them. Below zero, they overlap.",
    "- **Gaps flagged** and **false alarms** (real Matches flagged as Gaps) are at that threshold. A failed call counts as wrong. **Attacks resisted** counts every attack that didn't reach its goal, and leaves out attacks where a call failed; those are listed as failed.",
    "- **Cost** is the matching call only (Match reasons are a separate job). A call the Worker rejected reports no cost and counts as $0.",
  ];
  if (set.adversarial.length) {
    lines.push(
      "",
      "## Attacks used",
      "",
      "Each is a clean Question run again with this text added as a new paragraph, either to the Question or to one Scenario's Action, to see whether the Matcher obeys it.",
    );
    for (const attack of set.adversarial) {
      const where = attack.inject.into === "question" ? "hidden in the Question" : `hidden in Scenario \`${attack.inject.scenarioId}\`'s Action`;
      const goal = attack.goal === "match" || attack.inject.into === "question" ? "turn a Gap into a Match" : `make \`${attack.inject.scenarioId}\` the top Match`;
      lines.push("", `- **${attack.id}** attacks \`${attack.questionId}\`, ${where}, to ${goal}:`, "", ...attack.text.split("\n").map((l) => `  > ${l}`));
    }
  }
  for (const { title, intro, names } of sections) {
    const ranked = rankScores(results.filter((r) => names.includes(r.score.name)));
    lines.push(
      "",
      `## ${title}`,
      "",
      intro,
      "",
      metricsTable(ranked),
      "",
      `Best on this set: **${ranked[0]?.score.name ?? "none"}**. Ranked by top-1, then Gap mistakes (Gaps missed plus false alarms), then attacks that reached their goal, then margin, then cost.`,
    );
  }
  if (reasons) lines.push("", ...reasonsSection(reasons, shipped));
  for (const result of results) {
    const folded = sections.length > 0 && result.score.name !== shipped;
    lines.push(
      "",
      folded ? `<details>\n<summary>${result.score.name}</summary>` : `## ${result.score.name}`,
      "",
      "### Questions",
      "",
      "**Result** is the top Match in each run, or Gap, or failed. **Right** counts the runs where a Candidate would have seen the right thing: a correct top Match, or a labelled Gap flagged.",
      "",
      table(["Question", "Text", "Label", "Result", "Best score", "Right"], questionRows(result.score, set)),
    );
    if (result.score.failed.length) {
      lines.push(
        "",
        "### Failed calls",
        "",
        ...result.score.failed.map((f) => (f.caseId ? `- \`${f.caseId}\` (the attack on \`${f.questionId}\`): ${f.error}` : `- \`${f.questionId}\`: ${f.error}`)),
      );
    }
    if (result.score.adversarial.length) {
      const into = (id: string) => {
        const attack = set.adversarial.find((a) => a.id === id)!;
        return attack.inject.into === "question" ? "Question" : `Scenario \`${attack.inject.scenarioId}\``;
      };
      const goalText = (id: string) => {
        const attack = set.adversarial.find((a) => a.id === id)!;
        return attack.goal === "match" || attack.inject.into === "question" ? "turn a Gap into a Match" : `make \`${attack.inject.scenarioId}\` the top Match`;
      };
      lines.push(
        "",
        "### Adversarial cases",
        "",
        "Each case is its Question run again with hidden instructions injected, compared with the clean result from the same run. **Affected** means the attacked run reached the attack's goal and the clean run hadn't. **Changed (noise)** means what a Candidate would see changed some other way, which is the model varying between runs, not the injection working. **Failed** means a call failed, so there's nothing to compare. **Score** follows the Scenario the attack was hidden in (or the best score, for an attack in the Question), to show smaller effects.",
        "",
        table(
          ["Case", "Run", "Question", "Injected into", "Goal", "Clean", "Attacked", "Score", "Outcome"],
          result.score.adversarial.map((a) => [
            a.caseId,
            a.run,
            a.questionId,
            into(a.caseId),
            goalText(a.caseId),
            outcomeText(a.clean),
            outcomeText(a.attacked),
            `${a.score.of} ${a.score.clean ?? "failed"} → ${a.score.attacked ?? "failed"}`,
            RESULT_TEXT[a.result],
          ]),
        ),
      );
    }
    if (folded) lines.push("", "</details>");
  }
  return `${lines.join("\n")}\n`;
}

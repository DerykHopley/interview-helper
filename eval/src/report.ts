// The Matcher Report (spec #1): a dated Markdown file comparing Matchers on one Evaluation Set.
import { isGap, type EvaluationSet, type LabelledQuestion } from "./evaluationSet";
import type { MatcherScore, Outcome } from "./scoring";

export type ReportResult = { score: MatcherScore; models: string[] };

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

/** `shipped` names the Matcher the app ships, whose threshold the harness records for the app. */
export function renderReport({
  date,
  setName,
  set,
  shipped,
  results,
}: {
  date: string;
  setName: string;
  set: EvaluationSet;
  shipped: string;
  results: ReportResult[];
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
    table(
      ["Matcher", "Model", "Top-1", "Top-3", "Gap threshold", "Gaps flagged", "False alarms", "Attacks resisted", "Cost / Question", "Median time", "Slowest", "Failed"],
      results.map(({ score, models }) => [
        score.name,
        models.join(", ") || "none",
        ratio(score.top1),
        ratio(score.top3),
        score.gapThreshold,
        `${score.gaps.flagged}/${score.gaps.gapQuestions}`,
        `${score.gaps.falseAlarms}/${score.gaps.matchQuestions}`,
        `${score.adversarial.filter((a) => a.result === "resisted" || a.result === "changed").length}/${score.adversarial.filter((a) => a.result !== "failed").length}`,
        dollars(score.costPerQuestion),
        seconds(score.ms.median),
        seconds(score.ms.max),
        score.failed.length,
      ]),
    ),
    "",
    "- **Top-1:** the top-ranked Scenario is the best or an acceptable one. **Top-3:** a correct Scenario is in the first three. Both count non-Gap Questions only, and use the ranking alone.",
    "- Every count is out of Questions × runs. Models don't score the same way twice, so each Question's **best score** is shown as a range across runs.",
    "- **Gap threshold:** a Question is a Gap if even its best score is below it. It's the cut-off that sorts the most results correctly into Gap or not, over every run together, chosen on this same Evaluation Set, so Gap detection here is optimistic.",
    "- **Gaps flagged** and **false alarms** (real Matches flagged as Gaps) are at that threshold. A failed call counts as wrong. **Attacks resisted** counts every attack that didn't reach its goal, and leaves out attacks where a call failed; those are listed as failed.",
    "- **Cost** is the matching call only (Match reasons are a separate job). A call the Worker rejected reports no cost and counts as $0.",
  ];
  for (const result of results) {
    lines.push(
      "",
      `## ${result.score.name}`,
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
  }
  return `${lines.join("\n")}\n`;
}

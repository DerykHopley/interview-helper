// The Evaluation Set (CONTEXT.md): a fixed collection of Scenarios and labelled Questions used to score Matchers.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { ScenarioText } from "../../src/matching/Matcher";
import { asScenarioText } from "../../src/matching/findMatches";
import { parseScenario } from "../../src/scenarios/scenarioFormat";

/** A Question's label: the one best Scenario and any acceptable ones, or a Gap (no Scenario answers it). */
export type Label = { best: string; acceptable: string[] } | { gap: true };

export type LabelledQuestion = { id: string; text: string; skill?: string; label: Label };

/** What an attack tries to do: make the Scenario it's hidden in the top Match, or turn a Gap into a Match. */
export type AttackGoal = "promote" | "match";

/** A clean Question run again with hidden instructions injected into the Question or into one Scenario's Action. */
export type AdversarialCase = {
  id: string;
  /** The clean Question it attacks. */
  questionId: string;
  inject: { into: "question" } | { into: "scenario"; scenarioId: string };
  goal: AttackGoal;
  text: string;
};

/** A hand-written Match reason with the verdicts it should get: the reason judge is checked against these (#18). */
export type CalibrationItem = { id: string; questionId: string; scenarioId: string; reason: string; grounded: boolean; answers: boolean };

export type EvaluationSet = { scenarios: ScenarioText[]; questions: LabelledQuestion[]; adversarial: AdversarialCase[]; calibration?: CalibrationItem[] };

export const isGap = (label: Label): label is { gap: true } => "gap" in label;

const id = z.string().trim().min(1);
const questionsFile = z.object({
  questions: z.array(
    z.object({
      id,
      text: z.string().trim().min(1),
      skill: z.string().trim().min(1).optional(),
      best: id.optional(),
      acceptable: z.array(id).default([]),
      gap: z.literal(true).optional(),
    }),
  ),
  adversarial: z
    .array(
      z.object({
        id,
        question: id,
        into: z.enum(["question", "scenario"]),
        scenario: id.optional(),
        goal: z.enum(["promote", "match"]),
        text: z.string().trim().min(1),
      }),
    )
    .default([]),
});

const calibrationFile = z.object({
  reasons: z.array(z.object({ id, question: id, scenario: id, reason: z.string().trim().min(1), grounded: z.boolean(), answers: z.boolean() })),
});

/** Reads an Evaluation Set: Scenarios in the Scenario format keyed by id (their file name), the labelled Questions and
 * adversarial cases as YAML, and optionally the reason judge's calibration set. Throws, naming the problem, if
 * anything doesn't parse or doesn't add up. */
export function parseEvaluationSet(scenarioFiles: Record<string, string>, questionsYaml: string, calibrationYaml?: string): EvaluationSet {
  const scenarios = Object.entries(scenarioFiles).map(([scenarioId, markdown]): ScenarioText => {
    try {
      return asScenarioText({ ...parseScenario(markdown), id: scenarioId });
    } catch (e) {
      throw new Error(`Scenario "${scenarioId}" doesn't parse: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
    }
  });
  const file = questionsFile.parse(parse(questionsYaml));
  const known = (scenarioId: string, where: string) => {
    if (!(scenarioId in scenarioFiles)) throw new Error(`${where} names Scenario "${scenarioId}", which isn't in the set`);
    return scenarioId;
  };

  const seen = new Set<string>();
  const questions = file.questions.map(({ id, text, skill, best, acceptable, gap }): LabelledQuestion => {
    if (seen.has(id)) throw new Error(`Question "${id}" appears twice`);
    seen.add(id);
    if (!!gap === !!best) throw new Error(`Question "${id}" needs either a best Scenario or gap: true, not ${gap ? "both" : "neither"}`);
    if (best && acceptable.includes(best)) throw new Error(`Question "${id}" lists its best Scenario as acceptable too`);
    const label: Label = best
      ? { best: known(best, `Question "${id}"`), acceptable: acceptable.map((a) => known(a, `Question "${id}"`)) }
      : { gap: true };
    return { id, text, ...(skill && { skill }), label };
  });

  const adversarial = file.adversarial.map(({ id, question, into, scenario, goal, text }): AdversarialCase => {
    if (!seen.has(question)) throw new Error(`Adversarial case "${id}" attacks Question "${question}", which isn't in the set`);
    if (into === "question") {
      if (goal === "promote") throw new Error(`Adversarial case "${id}" promotes a Scenario, so it must be hidden in one`);
      return { id, questionId: question, inject: { into }, goal, text };
    }
    if (!scenario) throw new Error(`Adversarial case "${id}" goes into a Scenario but doesn't say which`);
    return { id, questionId: question, inject: { into, scenarioId: known(scenario, `Adversarial case "${id}"`) }, goal, text };
  });
  const calibration = calibrationYaml
    ? calibrationFile.parse(parse(calibrationYaml)).reasons.map(({ id, question, scenario, reason, grounded, answers }): CalibrationItem => {
        if (!seen.has(question)) throw new Error(`Calibration reason "${id}" is for Question "${question}", which isn't in the set`);
        return { id, questionId: question, scenarioId: known(scenario, `Calibration reason "${id}"`), reason, grounded, answers };
      })
    : [];
  return { scenarios, questions, adversarial, calibration };
}

/** Reads the Evaluation Set in a folder: `scenarios/<id>.md`, `questions.yaml`, and `reason-calibration.yaml` if
 * there is one. */
export function loadEvaluationSet(dir: string): EvaluationSet {
  const scenarioDir = join(dir, "scenarios");
  const files = readdirSync(scenarioDir).filter((f) => f.endsWith(".md")).sort();
  const scenarioFiles = Object.fromEntries(files.map((f) => [basename(f, ".md"), readFileSync(join(scenarioDir, f), "utf8")]));
  const calibration = join(dir, "reason-calibration.yaml");
  return parseEvaluationSet(scenarioFiles, readFileSync(join(dir, "questions.yaml"), "utf8"), existsSync(calibration) ? readFileSync(calibration, "utf8") : undefined);
}

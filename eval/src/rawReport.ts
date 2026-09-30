// The raw scores saved next to each Matcher Report (`…-matcher-report.json`), so it can be rendered again, e.g. after
// a change to the report's layout, without paying for new calls: `npm run eval -- --render <file>`.
import { z } from "zod";
import type { EvaluationSet } from "./evaluationSet";
import type { ReportSection } from "./report";
import type { CalibrationRun, ReasonsRun } from "./reasons";
import type { MatcherRun } from "./scoring";

export type RawReport = {
  date: string;
  setName: string;
  /** The Evaluation Set as it was run, so a later edit to it can't change an old report. */
  set: EvaluationSet;
  shipped: string;
  sections: ReportSection[];
  results: { name: string; models: string[]; runs: MatcherRun[] }[];
  /** The reason judge's runs (#18), when the report judged reasons. */
  reasons?: { judgeModel: string; runs: ReasonsRun[]; calibration: CalibrationRun };
};

const ranking = z.array(z.object({ scenarioId: z.string(), score: z.number() })).nullable();
const questionRun = z.object({ questionId: z.string(), ranking, error: z.string().optional(), cost: z.number(), ms: z.number() });
const verdict = { grounded: z.boolean(), answers: z.boolean(), note: z.string().nullable() };
const reasons = z.object({
  judgeModel: z.string(),
  runs: z.array(
    z.object({
      model: z.string(),
      checks: z.array(z.object({ questionId: z.string(), scenarioId: z.string(), rank: z.number(), reason: z.string(), form: z.array(z.string()), ...verdict })),
      failed: z.array(z.object({ questionId: z.string(), stage: z.enum(["reasons", "judge"]), error: z.string(), reasons: z.number().default(3) })),
      cost: z.number(),
      judgeCost: z.number().optional(),
      ms: z.array(z.number()),
      questions: z.number(),
    }),
  ),
  calibration: z.object({
    judgeModel: z.string(),
    cost: z.number(),
    failed: z.array(z.object({ id: z.string(), error: z.string() })),
    items: z.array(z.object({ id: z.string(), expected: z.object({ grounded: z.boolean(), answers: z.boolean() }), got: z.object(verdict).nullable() })),
  }),
});
const schema = z.object({
  date: z.string(),
  setName: z.string(),
  set: z.object({ scenarios: z.array(z.any()), questions: z.array(z.any()), adversarial: z.array(z.any()), calibration: z.array(z.any()).optional() }),
  shipped: z.string(),
  sections: z.array(z.object({ title: z.string(), intro: z.string(), names: z.array(z.string()) })),
  reasons: reasons.optional(),
  results: z.array(
    z.object({
      name: z.string(),
      models: z.array(z.string()),
      runs: z.array(
        z.object({
          name: z.string(),
          questions: z.array(questionRun),
          adversarial: z.array(
            z.object({ caseId: z.string(), questionId: z.string(), target: z.string().optional(), goal: z.enum(["promote", "match"]), run: questionRun }),
          ),
        }),
      ),
    }),
  ),
});

/** Reads a saved raw report; throws if the file isn't one. The Evaluation Set in it is trusted as saved. */
export const parseRawReport = (json: string): RawReport => schema.parse(JSON.parse(json));

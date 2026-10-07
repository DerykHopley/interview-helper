// An Interview (GLOSSARY.md): one job the Candidate is preparing for. Stored in the Vault as JSON, checked by this
// schema on every read (ADR 0004). Later tickets add fields with defaults, so older records still read.
import { z } from "zod";

const text = z.string().trim().min(1);

/** A Question's latest Matches, or its Gap (#10): saved so reopening doesn't spend again; re-run replaces it. */
export const matchResultSchema = z.object({
  gap: z.boolean(),
  matches: z.array(z.object({ scenarioId: z.string(), score: z.number(), reason: z.string() })),
  /** For a Gap: the kind of Scenario that would answer it. */
  suggestion: z.string().optional(),
  /** For a Gap: the best score found, below the threshold (#13). Absent on Gaps saved before it was recorded. */
  bestScore: z.number().optional(),
  matchedAt: z.string(),
  /** Of the Scenarios matched against, so the screen can tell when they've changed since. */
  scenariosFingerprint: z.string(),
  /** The Matcher and Prompt Variant that found them (the Matcher's name), so the screen can tell when either has
   * changed since. Empty on results saved before this was recorded, which then read as out of date. The Worker's model
   * isn't known to the app, so a model change isn't caught. */
  matchedWith: z.string().default(""),
});
export type MatchResult = z.infer<typeof matchResultSchema>;

const coverage = z.enum(["said", "missing"]);
/** Feedback's checklist as stored (#32). Kept here, apart from the model's reply schema (feedback.ts), so a change to
 * the prompt doesn't stop saved Feedback from reading. */
export const storedChecklistSchema = z.object({
  star: z.object({ situation: coverage, task: coverage, action: coverage, result: coverage }),
  measurableResult: coverage,
  notInScenario: z.array(z.object({ quote: z.string(), scenarioSays: z.string().nullable() })),
  /** Null when the Question gives no skill. */
  skill: z.object({ addressed: z.enum(["yes", "partly", "no"]), why: z.string() }).nullable(),
});
export type StoredChecklist = z.infer<typeof storedChecklistSchema>;

/** A Readiness Report's levels (#56, GLOSSARY.md "Readiness"). */
export const READINESS_LEVELS = ["ready", "nearly-there", "not-yet"] as const;
export type Readiness = (typeof READINESS_LEVELS)[number];

/** How well an Answer shows its Question's skill (or, without one, answers what it asks). */
export const SHOWS = ["yes", "partly", "no"] as const;
export type Shows = (typeof SHOWS)[number];

/** A Readiness Report as stored (#56), with every item tied to its Question by id. Kept apart from the model's reply
 * schema (readiness.ts) for the same reason as Feedback's checklist. */
export const storedReadinessSchema = z.object({
  readiness: z.enum(READINESS_LEVELS),
  /** The model said Ready, but a Question wasn't answered, so code lowered it to Nearly there. */
  capped: z.boolean(),
  why: z.string(),
  /** One per answered Question the model judged. */
  shows: z.array(z.object({ questionId: z.string(), shows: z.enum(SHOWS) })),
  /** Answered Questions the model left out of its judgement this time. */
  notJudged: z.array(z.string()).default([]),
  strengths: z.array(z.object({ questionId: z.string(), point: z.string(), quote: z.string() })),
  toWorkOn: z.array(z.object({ questionId: z.string(), point: z.string() })),
  /** Claims in an Answer that its picked Scenario doesn't support, quoted from the Answer. */
  notInScenario: z.array(z.object({ questionId: z.string(), quote: z.string() })),
  /** Answered Questions with no picked Scenario, whose claims couldn't be checked. */
  noScenarioPicked: z.array(z.string()),
  notPractised: z.array(z.string()),
});
export type StoredReadiness = z.infer<typeof storedReadinessSchema>;

export const questionSchema = z.object({
  id: z.string(),
  text,
  /** The skill it tests. Optional for a typed Question. */
  skill: text.optional(),
  origin: z.enum(["typed", "generated", "pack"]),
  matchResult: matchResultSchema.optional(),
  /** The Scenario the Candidate picked from the Matches (#11); absent until they pick one, or after un-picking. */
  pickedScenarioId: z.string().optional(),
  /** The Candidate's latest Answer, as typed in the answer bar (#31); absent until they answer. */
  answer: z
    .object({
      text,
      savedAt: z.string(),
      /** The latest Feedback on it (#32), with the text and the Scenario it was given for, so a later edit or another
       * pick shows it's out of date. */
      feedback: z
        .object({ checklist: storedChecklistSchema, forText: z.string(), forScenarioId: z.string(), forScenarioFingerprint: z.string(), gotAt: z.string() })
        .optional(),
    })
    .optional(),
});
export type Question = z.infer<typeof questionSchema>;

export const interviewSchema = z.object({
  role: text,
  company: text.optional(),
  /** None for an Interview from a Pack that doesn't give one (#7): then no Questions can be written for it. */
  jobSpec: text.optional(),
  questions: z.array(questionSchema).default([]),
  /** When an Answer was last saved here (#31), for the Interviews list. Clearing an Answer later doesn't undo it. */
  lastPractisedAt: z.string().optional(),
  /** The latest Readiness Report (#56), with a fingerprint of the Answers and picks it was given for, so a later change
   * shows it's out of date. */
  readinessReport: z.object({ report: storedReadinessSchema, forFingerprint: z.string(), gotAt: z.string() }).optional(),
});
export type Interview = z.infer<typeof interviewSchema>;

// An Interview (CONTEXT.md): one job the Candidate is preparing for. Stored in the Vault as JSON, checked by this
// schema on every read (ADR 0004). Later tickets add fields with defaults, so older records still read.
import { z } from "zod";

const text = z.string().trim().min(1);

/** A Question's latest Matches, or its Gap (#10): saved so reopening doesn't spend again; re-run replaces it. */
export const matchResultSchema = z.object({
  gap: z.boolean(),
  matches: z.array(z.object({ scenarioId: z.string(), score: z.number(), reason: z.string() })),
  /** For a Gap: the kind of Scenario that would answer it. */
  suggestion: z.string().optional(),
  matchedAt: z.string(),
  /** Of the Scenarios matched against, so the screen can tell when they've changed since. */
  scenariosFingerprint: z.string(),
  /** The Matcher and Prompt Variant that found them (the Matcher's name), so the screen can tell when either has
   * changed since. Empty on results saved before this was recorded, which then read as out of date. The Worker's model
   * isn't known to the app, so a model change isn't caught. */
  matchedWith: z.string().default(""),
});
export type MatchResult = z.infer<typeof matchResultSchema>;

export const questionSchema = z.object({
  id: z.string(),
  text,
  /** The skill it tests. Optional for a typed Question. */
  skill: text.optional(),
  origin: z.enum(["typed", "generated", "pack"]),
  matchResult: matchResultSchema.optional(),
});
export type Question = z.infer<typeof questionSchema>;

export const interviewSchema = z.object({
  role: text,
  company: text.optional(),
  jobSpec: text,
  questions: z.array(questionSchema).default([]),
});
export type Interview = z.infer<typeof interviewSchema>;

// An Interview (CONTEXT.md): one job the Candidate is preparing for. Stored in the Vault as JSON, checked by this
// schema on every read (ADR 0004). Later tickets add fields with defaults, so older records still read.
import { z } from "zod";

const text = z.string().trim().min(1);

/** A Question's latest Matches (#10): saved so reopening doesn't spend again; re-run replaces them. */
export const matchingSchema = z.object({
  gap: z.boolean(),
  matches: z.array(z.object({ scenarioId: z.string(), score: z.number(), reason: z.string() })),
  /** For a Gap: the kind of Scenario that would answer it. */
  suggestion: z.string().optional(),
  matchedAt: z.string(),
});
export type Matching = z.infer<typeof matchingSchema>;

export const questionSchema = z.object({
  id: z.string(),
  text,
  /** The skill it tests. Optional for a typed Question. */
  skill: text.optional(),
  origin: z.enum(["typed", "generated", "pack"]),
  matching: matchingSchema.optional(),
});
export type Question = z.infer<typeof questionSchema>;

export const interviewSchema = z.object({
  role: text,
  company: text.optional(),
  jobSpec: text,
  questions: z.array(questionSchema).default([]),
});
export type Interview = z.infer<typeof interviewSchema>;

import type { z } from "zod";

/** The LLM jobs the app runs; each maps to a configured model in the Worker. */
export type ModelJob = "question-generation" | "matching" | "match-reasons" | "co-writing";

export type StructuredRequest<Schema extends z.ZodType> = {
  job: ModelJob;
  system: string;
  /** Untrusted text (Job Specs, Scenarios, typed Questions) goes here, delimited as data. */
  user: string;
  /** Every reply must match this schema; a reply that doesn't is rejected. */
  schema: Schema;
};

/**
 * The single way the app reaches any model (spec #1, "Modules"). Remote calls go through the Worker; an
 * in-browser embedding model sits behind the same interface. It is the only thing faked in app-level tests.
 */
export interface ModelGateway {
  generate<Schema extends z.ZodType>(request: StructuredRequest<Schema>): Promise<z.infer<Schema>>;
  embed(texts: string[]): Promise<number[][]>;
}

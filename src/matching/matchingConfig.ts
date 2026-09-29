// Which Matcher the app ships, how it's prompted, and where a Gap starts (spec #1: chosen by config). Models are set
// per job in the Worker (worker/wrangler.jsonc JOB_MODELS: "matching", "match-reasons").
export const MATCHING_CONFIG = {
  matcher: "llm",
  promptVariant: "rubric-zero-shot",
  /** A Question is a Gap if even its best score is below this, on the LLM Matcher's 0–100 scale. A placeholder:
   * #14's Matcher Report replaces it with the cut-off measured on the Evaluation Set. */
  gapThreshold: 50,
  /** How many Matches are shown per Question. */
  shown: 3,
} as const;

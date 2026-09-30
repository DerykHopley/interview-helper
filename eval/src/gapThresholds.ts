// Recording a Matcher Report's threshold in the file the app reads (src/matching/gapThresholds.json).
import type { RecordedThresholds } from "../../src/matching/matchingConfig";

/** The recorded thresholds with this Matcher's replaced by a report's, the others kept. */
export const withThreshold = (recorded: RecordedThresholds, matcherName: string, gapThreshold: number, report: string): RecordedThresholds => ({
  ...recorded,
  [matcherName]: { gapThreshold, report },
});

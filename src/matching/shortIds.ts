// Scenarios are sent to a model under short ids (S1, S2…): smaller prompts, and the Vault's ids stay out of them.
import type { ScenarioText } from "./Matcher";

/** Thrown when a model's reply doesn't cover exactly the Scenarios it was sent. */
export class IncompleteReplyError extends Error {
  constructor(what: string) {
    super(`The model's reply ${what}`);
    this.name = "IncompleteReplyError";
  }
}

export function withShortIds(scenarios: ScenarioText[]) {
  const sent = scenarios.map((scenario, i) => ({ ...scenario, id: `S${i + 1}` }));
  return {
    sent,
    /** The reply's entries by real Scenario id, checking there's exactly one for each Scenario sent. */
    byScenario<T extends { id: string }>(entries: T[]): Map<string, T> {
      const found = new Map(entries.map((entry) => [entry.id, entry]));
      if (entries.length !== sent.length || sent.some(({ id }) => !found.has(id))) {
        throw new IncompleteReplyError(`should have one entry for each of the ${sent.length} Scenarios`);
      }
      return new Map(sent.map(({ id }, i) => [scenarios[i].id, found.get(id)!]));
    },
  };
}

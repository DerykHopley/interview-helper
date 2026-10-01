// The Scenario Bank's storage: each Scenario is kept in the Vault, encrypted, as its Markdown text.
import type { UnlockedVault } from "../vault/vault";
import { countOf } from "../text";
import { parseScenario, toMarkdown, type Scenario } from "./scenarioFormat";

const PREFIX = "scenario:";

export type SavedScenario = Scenario & { id: string };

export function scenarioBank(vault: UnlockedVault) {
  /** The Scenarios in title order, and how many stored ones couldn't be read (damaged, or not a valid Scenario). */
  async function list(): Promise<{ scenarios: SavedScenario[]; unreadable: number }> {
    const records = await vault.list<string>(PREFIX);
    const scenarios: SavedScenario[] = [];
    for (const record of records) {
      try {
        if (record.readable) scenarios.push({ ...parseScenario(record.value), id: record.id });
      } catch {
        // counted below
      }
    }
    scenarios.sort((a, b) => a.title.localeCompare(b.title));
    return { scenarios, unreadable: records.length - scenarios.length };
  }

  return {
    list,
    /** Saves a new Scenario, or replaces the one with this id. Returns its id. */
    async save(scenario: Scenario, id: string = `${PREFIX}${crypto.randomUUID()}`) {
      await vault.put(id, toMarkdown(scenario));
      return id;
    },
    delete: (id: string) => vault.delete(id),
    /** Deletes every Demo Scenario, edited or not. The Candidate's own stay. */
    async removeDemo() {
      const { scenarios } = await list();
      await Promise.all(scenarios.filter((s) => s.origin === "demo").map((s) => vault.delete(s.id)));
    },
  };
}

/** What's asked before removing all Demo Scenarios, from the Scenario Bank's demo bar or the dashboard's card. */
export const removeDemoQuestion = (n: number) =>
  `Remove ${countOf(n, "demo Scenario")}? Your own Scenarios stay, and so do your Interviews.`;

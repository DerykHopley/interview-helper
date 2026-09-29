// The Scenario Bank's storage: each Scenario is kept in the Vault, encrypted, as its Markdown text.
import type { UnlockedVault } from "../vault/vault";
import { parseScenario, toMarkdown, type Scenario } from "./scenarioFormat";

const PREFIX = "scenario:";

export type SavedScenario = Scenario & { id: string };

export function scenarioBank(vault: UnlockedVault) {
  return {
    /** In title order. */
    async list(): Promise<SavedScenario[]> {
      const records = await vault.list<string>(PREFIX);
      return records.map(({ id, value }) => ({ ...parseScenario(value), id })).sort((a, b) => a.title.localeCompare(b.title));
    },
    /** Saves a new Scenario, or replaces the one with this id. Returns its id. */
    async save(scenario: Scenario, id: string = `${PREFIX}${crypto.randomUUID()}`) {
      await vault.put(id, toMarkdown(scenario));
      return id;
    },
    delete: (id: string) => vault.delete(id),
  };
}

export type ScenarioBankStore = ReturnType<typeof scenarioBank>;

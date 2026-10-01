// Choosing a Pack (CONTEXT.md "Pack"): it creates an Interview from the Pack's Questions and copies its Example
// Scenarios in as Demo Scenarios. Example Scenarios are only ever matched as those copies.
import { interviewStore } from "../interviews/interviewStore";
import { scenarioBank } from "../scenarios/scenarioBank";
import type { Scenario } from "../scenarios/scenarioFormat";
import type { UnlockedVault } from "../vault/vault";
import type { Pack } from "./packFormat";

/** What choosing a Pack will add: its Example Scenarios, less those already here as a Demo Scenario of the same
 * title (from choosing it before), which are skipped. */
export type PackPlan = { newScenarios: Scenario[]; skipped: number };

const titleKey = (title: string) => title.trim().toLowerCase();

export async function planPack(pack: Pack, vault: UnlockedVault): Promise<PackPlan> {
  const { scenarios } = await scenarioBank(vault).list();
  const demoTitles = new Set(scenarios.filter((s) => s.origin === "demo").map((s) => titleKey(s.title)));
  const newScenarios = pack.exampleScenarios.filter((s) => !demoTitles.has(titleKey(s.title)));
  return { newScenarios, skipped: pack.exampleScenarios.length - newScenarios.length };
}

/** Adds the Pack's Interview and its new Demo Scenarios. Resolves to the new Interview's id. */
export async function addPack(pack: Pack, vault: UnlockedVault): Promise<string> {
  const bank = scenarioBank(vault);
  await Promise.all((await planPack(pack, vault)).newScenarios.map((scenario) => bank.save(scenario)));
  return interviewStore(vault).save({
    role: pack.role,
    company: pack.company,
    jobSpec: pack.jobSpec,
    questions: pack.questions.map(({ text, skill }) => ({ id: crypto.randomUUID(), text, skill, origin: "pack" })),
  });
}

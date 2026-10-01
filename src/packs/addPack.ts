// Adding a Pack (CONTEXT.md "Pack"): it creates an Interview from the Pack's Questions and copies its Example
// Scenarios in as Demo Scenarios. Example Scenarios are only ever matched as those copies.
import { interviewStore } from "../interviews/interviewStore";
import { isDemo, scenarioBank } from "../scenarios/scenarioBank";
import type { Scenario } from "../scenarios/scenarioFormat";
import type { UnlockedVault } from "../vault/vault";
import type { Pack } from "./packFormat";

/** What adding a Pack will do with its Example Scenarios: copy in the new ones, and skip those already here as a Demo
 * Scenario of the same title (from adding it before). */
export type PackPlan = { newScenarios: Scenario[]; skipped: Scenario[] };

const titleKey = (title: string) => title.trim().toLowerCase();

export async function planPack(pack: Pack, vault: UnlockedVault): Promise<PackPlan> {
  const { scenarios } = await scenarioBank(vault).list();
  const demoTitles = new Set(scenarios.filter(isDemo).map((s) => titleKey(s.title)));
  const isHere = (s: Scenario) => demoTitles.has(titleKey(s.title));
  return { newScenarios: pack.exampleScenarios.filter((s) => !isHere(s)), skipped: pack.exampleScenarios.filter(isHere) };
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

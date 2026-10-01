// Removing Scenarios touches two stores: the Scenarios go from the Scenario Bank, and any picks of them in the
// Interviews are cleared (#11), so a Question never points at a Scenario that's gone.
import { interviewStore } from "../interviews/interviewStore";
import { clearPicksOf, picksOf } from "../interviews/picks";
import { countOf } from "../text";
import type { UnlockedVault } from "../vault/vault";
import { isDemo, scenarioBank, type SavedScenario } from "./scenarioBank";

async function removeScenarios(vault: UnlockedVault, ids: string[]) {
  const bank = scenarioBank(vault);
  await Promise.all(ids.map((id) => bank.delete(id)));
  await clearPicksOf(interviewStore(vault), ids);
}

/** Asks first, warning if it's someone's pick (read now, so the warning is never missing), then deletes the Scenario
 * and clears its picks. Resolves to whether it was deleted. */
export async function deleteScenario(vault: UnlockedVault, scenario: SavedScenario) {
  const { interviews } = await interviewStore(vault).list();
  const picked = picksOf(interviews, scenario.id).length;
  const warning = picked > 0 ? ` It's the picked Scenario in ${countOf(picked, "Interview")}; those Questions will need a new pick.` : "";
  if (!confirm(`Delete "${scenario.title}"? This can't be undone.${warning}`)) return false;
  await removeScenarios(vault, [scenario.id]);
  return true;
}

/** Asks first, then deletes every Demo Scenario, edited or not, and clears their picks; the Candidate's own stay.
 * Resolves to whether they were removed. Used by the Scenario Bank's demo bar and the dashboard's card. */
export async function removeDemoScenarios(vault: UnlockedVault, count: number) {
  const question = `Remove ${countOf(count, "demo Scenario")}? Your own Scenarios stay, and so do your Interviews; any picks of the demo Scenarios are cleared.`;
  if (!confirm(question)) return false;
  const { scenarios } = await scenarioBank(vault).list();
  await removeScenarios(vault, scenarios.filter(isDemo).map((s) => s.id));
  return true;
}

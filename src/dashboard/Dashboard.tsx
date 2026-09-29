import { AccessChip } from "../access/AccessChip";
import { ScenarioBank } from "../scenarios/ScenarioBank";
import { useAutoLock } from "../vault/useAutoLock";
import type { UnlockedVault } from "../vault/vault";

/** The unlocked app, the D2 dashboard: a top bar with the tabs, Access and Lock. Only the Scenario Bank tab exists
 * so far; #8 adds Interviews and #6 Backup (D2 order: Interviews · Scenario Bank · Backup). */
export function Dashboard({ vault, onLock }: { vault: UnlockedVault; onLock: () => void }) {
  useAutoLock(onLock);
  return (
    <>
      <header className="top-bar">
        <h1 className="top-bar-brand">Interview Helper</h1>
        <nav className="tabs" role="tablist" aria-label="Sections">
          <button type="button" role="tab" id="tab-scenario-bank" className="tab" aria-selected="true" aria-controls="panel-scenario-bank">
            Scenario Bank
          </button>
        </nav>
        <div className="top-bar-end">
          <AccessChip vault={vault} />
          <button type="button" className="button-lock" onClick={onLock}>
            Lock
          </button>
        </div>
      </header>
      <main className="dashboard">
        <div role="tabpanel" id="panel-scenario-bank" aria-labelledby="tab-scenario-bank">
          <ScenarioBank vault={vault} />
        </div>
      </main>
    </>
  );
}

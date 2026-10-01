import { useMemo, useState } from "react";
import { useCancellableEffect } from "../hooks";
import { isDemo, REMOVE_DEMO_FAILED, scenarioBank, type SavedScenario } from "../scenarios/scenarioBank";
import { wordFor } from "../text";
import type { UnlockedVault } from "../vault/vault";

type Counts = { all: number; demo: number };
const countsOf = ({ scenarios }: { scenarios: SavedScenario[] }): Counts => ({ all: scenarios.length, demo: scenarios.filter(isDemo).length });

/** D2's side column card for the Scenario Bank, with "N demo · Remove demo" while there are Demo Scenarios. */
export function ScenarioBankCard({ vault, onOpen }: { vault: UnlockedVault; onOpen: () => void }) {
  const bank = useMemo(() => scenarioBank(vault), [vault]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [failure, setFailure] = useState(false);

  useCancellableEffect(
    (isCurrent) => {
      bank.list().then(
        (result) => isCurrent() && setCounts(countsOf(result)),
        () => {},
      );
    },
    [bank],
  );

  async function removeDemo(count: number) {
    setFailure(false);
    try {
      if (await bank.removeDemo(count)) setCounts(countsOf(await bank.list()));
    } catch {
      setFailure(true);
    }
  }

  return (
    <section className="side-card" aria-labelledby="side-scenario-bank">
      <h3 id="side-scenario-bank" className="label-caps side-card-title">
        Scenario Bank
      </h3>
      {counts !== null && (
        <p className="side-card-count">
          <strong>{counts.all}</strong> {wordFor(counts.all, "Scenario")}
        </p>
      )}
      {counts !== null && counts.demo > 0 && (
        <p className="side-card-demo">
          {counts.demo} demo ·{" "}
          <button type="button" className="button-link" onClick={() => void removeDemo(counts.demo)}>
            Remove demo
          </button>
        </p>
      )}
      {failure && (
        <p role="alert" className="notice-warn">
          {REMOVE_DEMO_FAILED}
        </p>
      )}
      <button type="button" className="button-secondary" onClick={onOpen}>
        Open Scenario Bank
      </button>
    </section>
  );
}

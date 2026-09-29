import { useMemo, useState } from "react";
import { useCancellableEffect } from "../hooks";
import { scenarioBank } from "../scenarios/scenarioBank";
import type { UnlockedVault } from "../vault/vault";

/** D2's side column card for the Scenario Bank. #7 adds "N demo · Remove demo". */
export function ScenarioBankCard({ vault, onOpen }: { vault: UnlockedVault; onOpen: () => void }) {
  const bank = useMemo(() => scenarioBank(vault), [vault]);
  const [count, setCount] = useState<number | null>(null);

  useCancellableEffect(
    (isCurrent) => {
      bank.list().then(
        ({ scenarios }) => isCurrent() && setCount(scenarios.length),
        () => {},
      );
    },
    [bank],
  );

  return (
    <section className="side-card" aria-labelledby="side-scenario-bank">
      <h3 id="side-scenario-bank" className="label-caps side-card-title">
        Scenario Bank
      </h3>
      {count !== null && (
        <p className="side-card-count">
          <strong>{count}</strong> {count === 1 ? "Scenario" : "Scenarios"}
        </p>
      )}
      <button type="button" className="button-secondary" onClick={onOpen}>
        Open Scenario Bank
      </button>
    </section>
  );
}

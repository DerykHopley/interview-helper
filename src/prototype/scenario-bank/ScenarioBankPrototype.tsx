// PROTOTYPE — the Scenario Bank (spec stories 24–32, 47–50), shown inside the chosen dashboard (D2) on its
// Scenario Bank tab. Three variants via ?variant=B1|B2|B3; ?scenario=empty starts with no stories;
// ?mode=read|edit|choose|new opens a given state (for screenshots). All in memory.
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { useDashboard } from "../dashboard/data";
import { VariantD2 } from "../dashboard/VariantD2";
import { useBank, type Bank } from "./data";
import { VariantB1 } from "./VariantB1";
import { VariantB2 } from "./VariantB2";
import { VariantB3 } from "./VariantB3";
import "../dashboard/dashboard.css";
import "./scenario-bank.css";

const variants: VariantDef[] = [
  { key: "B1", name: "List and reading pane" },
  { key: "B2", name: "Card grid" },
  { key: "B3", name: "Skills first" },
];

function StatePanel({ bank }: { bank: Bank }) {
  const by = (o: string) => bank.scenarios.filter((s) => s.origin === o).length;
  return (
    <div className="db-state">
      <div>scenarios: {bank.scenarios.length} (hand {by("hand")}, co-written {by("co-written")}, demo {by("demo")})</div>
      <div><button onClick={() => bank.reset(true)}>Empty bank</button><button onClick={() => bank.reset(false)}>Sample stories</button></div>
    </div>
  );
}

export function ScenarioBankPrototype() {
  const [variant, setVariant] = useVariant(variants);
  const dash = useDashboard();
  const bank = useBank();
  const page = variant === "B1" ? <VariantB1 key="B1" bank={bank} /> : variant === "B2" ? <VariantB2 key="B2" bank={bank} /> : <VariantB3 key="B3" bank={bank} />;
  return (
    <>
      <VariantD2 dash={dash} initialTab="bank" bankPage={page} />
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={<StatePanel bank={bank} />} />
    </>
  );
}

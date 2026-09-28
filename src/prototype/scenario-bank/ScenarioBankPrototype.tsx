// PROTOTYPE — the Scenario Bank (spec stories 24–32, 47–50), shown inside the chosen dashboard (D2) on its
// Scenario Bank tab. Round 2: B1's list and pane with B3's skills overview in three placements, via
// ?variant=C1|C2|C3 (round 1's B1–B3 are still reachable by key); ?scenario=empty starts with no stories;
// ?mode=read|edit|choose|new opens a given state (for screenshots). All in memory.
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { useDashboard } from "../dashboard/data";
import { VariantD2 } from "../dashboard/VariantD2";
import { useBank, type Bank } from "./data";
import { VariantB1 } from "./VariantB1";
import { VariantB2 } from "./VariantB2";
import { VariantB3 } from "./VariantB3";
import { CombinedBank } from "./Combined";
import "../dashboard/dashboard.css";
import "./scenario-bank.css";

const variants: VariantDef[] = [
  { key: "C1", name: "Skills above" },
  { key: "C2", name: "Skills in the list column" },
  { key: "C3", name: "Skills strip" },
];
const round1 = ["B1", "B2", "B3"];

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
  // Round 1 keys still work from the URL (?variant=B1), but the bar cycles round 2.
  const requested = new URLSearchParams(location.search).get("variant") ?? "";
  const [variant, setVariant] = useVariant(round1.includes(requested) ? [...variants, { key: requested, name: `Round 1 ${requested}` }] : variants);
  const dash = useDashboard();
  const bank = useBank();
  const page =
    variant === "C1" ? <CombinedBank key="C1" bank={bank} placement="above" />
    : variant === "C2" ? <CombinedBank key="C2" bank={bank} placement="column" />
    : variant === "C3" ? <CombinedBank key="C3" bank={bank} placement="strip" />
    : variant === "B1" ? <VariantB1 key="B1" bank={bank} />
    : variant === "B2" ? <VariantB2 key="B2" bank={bank} />
    : <VariantB3 key="B3" bank={bank} />;
  return (
    <>
      <VariantD2 dash={dash} initialTab="bank" bankPage={page} />
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={<StatePanel bank={bank} />} />
    </>
  );
}

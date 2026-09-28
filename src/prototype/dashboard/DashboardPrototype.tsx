// PROTOTYPE — the dashboard after unlocking: the Interviews list and creating one from a Job Spec are the core;
// the Scenario Bank and Backup are reachable but stubbed (prototyped next). Three variants via ?variant=D1|D2|D3.
// ?scenario=empty starts with no Interviews; ?token=expired|none turns AI off; ?create=1 opens the create form.
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { useDashboard, type Dashboard } from "./data";
import { VariantD1 } from "./VariantD1";
import { VariantD2 } from "./VariantD2";
import { VariantD3 } from "./VariantD3";
import "./dashboard.css";

const variants: VariantDef[] = [
  { key: "D1", name: "Decks on the table" },
  { key: "D2", name: "Classic dashboard" },
  { key: "D3", name: "Next step" },
];

function StatePanel({ dash }: { dash: Dashboard }) {
  return (
    <div className="db-state">
      <div>interviews: {dash.interviews.length} · scenarios: {dash.bank.scenarios} ({dash.bank.demo} demo) · last export: {dash.bank.lastExport ?? "never"}</div>
      <div>access token: {dash.token}{dash.generating && " · generating Questions…"}</div>
      <div>
        <button onClick={() => dash.reset(true)}>Empty (new Candidate)</button>
        <button onClick={() => dash.reset(false)}>Sample data</button>
        {(["active", "expired", "none"] as const).map((t) => <button key={t} onClick={() => dash.setToken(t)}>token: {t}</button>)}
      </div>
    </div>
  );
}

export function DashboardPrototype() {
  const [variant, setVariant] = useVariant(variants);
  const dash = useDashboard();
  return (
    <>
      {variant === "D1" && <VariantD1 dash={dash} />}
      {variant === "D2" && <VariantD2 dash={dash} />}
      {variant === "D3" && <VariantD3 dash={dash} />}
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={<StatePanel dash={dash} />} />
    </>
  );
}

// PROTOTYPE — the access screens: Access Token, Unlock Key setup, unlock, Start over (ADR 0002, spec stories 8–23).
// Three structurally different variants, switchable via ?variant=A1|A2|A3, and ?scenario= to start in
// first-visit | returning | token-expired | no-token. All state is in memory; nothing is encrypted or stored.
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { SAMPLE_TOKENS, hoursLeft, useAccess, type Access, type Scenario } from "./access";
import { VariantA1 } from "./VariantA1";
import { VariantA2 } from "./VariantA2";
import { VariantA3 } from "./VariantA3";
import "./access.css";

const variants: VariantDef[] = [
  { key: "A1", name: "Card on the table" },
  { key: "A2", name: "Checklist" },
  { key: "A3", name: "Keyring" },
];

function StatePanel({ access }: { access: Access }) {
  const jumps: [Scenario, string][] = [["first-visit", "First visit"], ["returning", "Returning (locked)"], ["token-expired", "Token expired"], ["no-token", "No token"]];
  return (
    <div className="ac-state">
      <div>stage: {access.stage}</div>
      <div>unlock key: {access.storedKey ?? "none yet"}{access.stage === "first-visit" && ` (new: ${access.newKey})`}</div>
      <div>access token: {access.token ? `${access.token.label}, ${hoursLeft(access.token)}h left` : access.tokenExpired ? "expired" : "none"}</div>
      <div>demo data: {access.demoData ? "yes" : "no"}</div>
      <div className="ac-state-row">try tokens: <code>{SAMPLE_TOKENS.valid}</code> (valid) · <code>{SAMPLE_TOKENS.expired}</code> (expired)</div>
      <div className="ac-state-row">
        jump to:{" "}
        {jumps.map(([s, label]) => <button key={s} onClick={() => access.jump(s)}>{label}</button>)}
        {access.stage === "unlocked" && <button onClick={access.lock}>Simulate 15 min idle</button>}
        {access.token && <button onClick={access.expireToken}>Expire token now</button>}
      </div>
    </div>
  );
}

export function AccessPrototype() {
  const [variant, setVariant] = useVariant(variants);
  const access = useAccess();
  return (
    <>
      {variant === "A1" && <VariantA1 key={access.resetKey} access={access} />}
      {variant === "A2" && <VariantA2 key={access.resetKey} access={access} />}
      {variant === "A3" && <VariantA3 key={access.resetKey} access={access} />}
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={<StatePanel access={access} />} />
    </>
  );
}

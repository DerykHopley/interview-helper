// PROTOTYPE — the Backup page (Scenario Export/import, Packs), shown inside the chosen dashboard (D2) on its
// Backup tab. Three variants via ?variant=X1|X2|X3. ?backup=recent starts backed up; ?storage=denied starts
// without persistent storage; ?pick=<n> opens the import flow with sample file n (for screenshots).
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { useDashboard } from "../dashboard/data";
import { VariantD2 } from "../dashboard/VariantD2";
import { DEVICE_KEY, OTHER_KEY, SAMPLE_FILES, useBackup, type Backup } from "./backup";
import { VariantX1 } from "./VariantX1";
import { VariantX2 } from "./VariantX2";
import { VariantX3 } from "./VariantX3";
import "../dashboard/dashboard.css";
import "./backup.css";

const variants: VariantDef[] = [
  { key: "X1", name: "Three panels" },
  { key: "X2", name: "One drop zone" },
  { key: "X3", name: "Pick a task" },
];

function StatePanel({ backup }: { backup: Backup }) {
  return (
    <div className="db-state">
      <div>stories: {backup.stories} · last backup: {backup.lastExport ?? "never"} · packs: {backup.packs.length} · storage: {backup.persistent}</div>
      <div>sample files: {SAMPLE_FILES.map((f) => f.name).join(" · ")}</div>
      <div>this device's Unlock Key: <code>{DEVICE_KEY}</code> · key for old-laptop-backup.ihx: <code>{OTHER_KEY}</code></div>
      <div><button onClick={() => backup.setPersistent(backup.persistent === "granted" ? "denied" : "granted")}>toggle persistent storage</button></div>
    </div>
  );
}

export function BackupPrototype() {
  const [variant, setVariant] = useVariant(variants);
  const dash = useDashboard();
  const backup = useBackup();
  const page = variant === "X1" ? <VariantX1 key="X1" backup={backup} /> : variant === "X2" ? <VariantX2 key="X2" backup={backup} /> : <VariantX3 key="X3" backup={backup} />;
  return (
    <>
      <VariantD2 dash={dash} initialTab="backup" backupPage={page} />
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={<StatePanel backup={backup} />} />
    </>
  );
}

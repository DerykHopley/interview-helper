import { PacksPanel } from "../packs/PacksPanel";
import type { UnlockedVault } from "../vault/vault";

/** The dashboard's Backup tab (X4 design). #7 brings the Packs panel; #6 adds the status line above it, with
 * Download backup file, and the Restore from a backup panel beside it. */
export function BackupPage({ vault, onPackAdded }: { vault: UnlockedVault; onPackAdded: (interviewId: string) => void }) {
  return (
    <div className="backup">
      <h2 className="page-title">Backup &amp; import</h2>
      <div className="backup-panels">
        <PacksPanel vault={vault} onAdded={onPackAdded} />
      </div>
    </div>
  );
}

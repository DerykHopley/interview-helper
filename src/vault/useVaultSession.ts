import { useCallback, useEffect, useState } from "react";
import { openDatabase } from "./indexedDb";
import { createVault, type UnlockedVault, type Vault } from "./vault";

export type VaultSession =
  | { status: "opening" }
  | { status: "new"; vault: Vault }
  | { status: "locked"; vault: Vault }
  | { status: "unlocked"; vault: Vault; unlocked: UnlockedVault };

/** Opens this browser's Vault and tracks whether it's new, locked or unlocked. The unlocked Vault, and with it the
 * encryption key, is held only in this React state. */
export function useVaultSession() {
  const [session, setSession] = useState<VaultSession>({ status: "opening" });

  useEffect(() => {
    let closed = false;
    const opening = openDatabase();
    void opening.then(async (db) => {
      const vault = createVault(db);
      const exists = await vault.exists();
      if (!closed) setSession({ status: exists ? "locked" : "new", vault });
    });
    return () => {
      closed = true;
      void opening.then((db) => db.close());
    };
  }, []);

  /** Creates the Vault, lets `fill` store what setup collected, and only then opens the app. */
  const create = useCallback(async (vault: Vault, unlockKey: string, fill: (unlocked: UnlockedVault) => Promise<void>) => {
    const unlocked = await vault.create(unlockKey);
    await fill(unlocked);
    setSession({ status: "unlocked", vault, unlocked });
  }, []);

  const unlock = useCallback(async (vault: Vault, unlockKey: string) => {
    const unlocked = await vault.unlock(unlockKey);
    if (unlocked) setSession({ status: "unlocked", vault, unlocked });
    return unlocked !== null;
  }, []);

  const lock = useCallback((vault: Vault) => setSession({ status: "locked", vault }), []);

  const startOver = useCallback(async (vault: Vault) => {
    await vault.wipe();
    setSession({ status: "new", vault });
  }, []);

  return { session, create, unlock, lock, startOver };
}

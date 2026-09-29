import { useCallback, useState } from "react";
import { useCancellableEffect } from "../hooks";
import { openDatabase } from "./indexedDb";
import { createVault, type UnlockedVault, type Vault } from "./vault";

export type VaultState =
  | { status: "opening" }
  | { status: "unavailable" }
  | { status: "new"; vault: Vault }
  | { status: "locked"; vault: Vault }
  | { status: "unlocked"; vault: Vault; unlocked: UnlockedVault };

/** Opens this browser's Vault and tracks whether it's new, locked or unlocked. The unlocked Vault, and with it the
 * encryption key, is held only in this React state. */
export function useVault() {
  const [state, setState] = useState<VaultState>({ status: "opening" });

  useCancellableEffect((isCurrent) => {
    const opening = openDatabase();
    opening
      .then(async (db) => {
        const vault = createVault(db);
        const exists = await vault.exists();
        if (isCurrent()) setState({ status: exists ? "locked" : "new", vault });
      })
      .catch(() => {
        if (isCurrent()) setState({ status: "unavailable" }); // e.g. private browsing, or site data blocked
      });
    return () => void opening.then((db) => db.close(), () => {});
  }, []);

  const vault = "vault" in state ? state.vault : null;

  /** Creates the Vault, lets `fill` store what setup collected, and only then opens the app. */
  const create = useCallback(
    async (unlockKey: string, fill: (unlocked: UnlockedVault) => Promise<void>) => {
      if (!vault) return;
      const unlocked = await vault.create(unlockKey);
      await fill(unlocked);
      setState({ status: "unlocked", vault, unlocked });
    },
    [vault],
  );

  /** Resolves to false when the key doesn't match. */
  const unlock = useCallback(
    async (unlockKey: string) => {
      const unlocked = await vault?.unlock(unlockKey);
      if (vault && unlocked) setState({ status: "unlocked", vault, unlocked });
      return Boolean(unlocked);
    },
    [vault],
  );

  /** Drops the key from the unlocked Vault, then shows the unlock screen. */
  const lock = useCallback(() => {
    if (state.status !== "unlocked") return;
    state.unlocked.lock();
    setState({ status: "locked", vault: state.vault });
  }, [state]);

  const startOver = useCallback(async () => {
    if (!vault) return;
    await vault.wipe();
    setState({ status: "new", vault });
  }, [vault]);

  return { state, create, unlock, lock, startOver };
}

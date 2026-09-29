import { useCallback } from "react";
import { useAutoLock } from "../vault/useAutoLock";
import { useVault } from "../vault/useVault";
import type { UnlockedVault } from "../vault/vault";
import { AccessStatus } from "./AccessStatus";
import { dropAccessTokenFromMemory, keptAccessToken } from "./keptAccessToken";
import { Setup } from "./Setup";
import { Unlock } from "./Unlock";

/** Chooses what the Candidate sees from the state of their Vault: first-visit setup, unlock, or the app itself. */
export function VaultGate() {
  const { state, create, unlock, lock, startOver } = useVault();
  const lockApp = useCallback(() => {
    dropAccessTokenFromMemory();
    lock();
  }, [lock]);

  switch (state.status) {
    case "opening":
      return null;
    case "unavailable":
      return (
        <p role="alert">
          This browser won't let the app store data, so it can't keep your Scenarios. This can happen in a private window
          or when site data is blocked. Try a normal window, or allow site data for this site.
        </p>
      );
    case "new":
      return (
        <Setup
          onComplete={(unlockKey, accessToken) =>
            create(unlockKey, async (unlocked) => {
              if (accessToken) await keptAccessToken(unlocked).keep(accessToken);
            })
          }
        />
      );
    case "locked":
      return <Unlock onUnlock={unlock} onStartOver={startOver} />;
    case "unlocked":
      return <UnlockedApp vault={state.unlocked} onLock={lockApp} />;
  }
}

/** Inside the app, for now just Access and Lock; later tickets add the Scenario Bank and Interviews. */
function UnlockedApp({ vault, onLock }: { vault: UnlockedVault; onLock: () => void }) {
  useAutoLock(onLock);
  return (
    <section>
      <AccessStatus vault={vault} />
      <button type="button" onClick={onLock}>
        Lock
      </button>
    </section>
  );
}

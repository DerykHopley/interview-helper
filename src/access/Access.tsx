import { useAutoLock } from "../vault/useAutoLock";
import { useVaultSession } from "../vault/useVaultSession";
import type { UnlockedVault } from "../vault/vault";
import { AccessStatus, keepAccessToken } from "./AccessStatus";
import { accessTokenStore } from "./accessTokenStore";
import { Setup } from "./Setup";
import { Unlock } from "./Unlock";

/** Chooses what the Candidate sees from the state of their Vault: first-visit setup, unlock, or the app itself. */
export function Access() {
  const { session, create, unlock, lock, startOver } = useVaultSession();

  if (session.status === "opening") return null;
  if (session.status === "new") {
    return (
      <Setup
        onComplete={(unlockKey, accessToken) =>
          create(session.vault, unlockKey, async (unlocked) => {
            if (accessToken) await keepAccessToken(unlocked, accessToken);
          })
        }
      />
    );
  }
  if (session.status === "locked") return (
      <Unlock onUnlock={(unlockKey) => unlock(session.vault, unlockKey)} onStartOver={() => startOver(session.vault)} />
    );
  return <Unlocked unlocked={session.unlocked} onLock={() => { accessTokenStore.clear(); lock(session.vault); }} />;
}

/** Inside the app, for now just Access and Lock; later tickets add the Scenario Bank and Interviews. */
function Unlocked({ unlocked, onLock }: { unlocked: UnlockedVault; onLock: () => void }) {
  useAutoLock(onLock);
  return (
    <section>
      <AccessStatus vault={unlocked} />
      <button type="button" onClick={onLock}>
        Lock
      </button>
    </section>
  );
}

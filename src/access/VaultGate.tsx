import { useCallback } from "react";
import { useVault } from "../vault/useVault";
import { Dashboard } from "../dashboard/Dashboard";
import { dropAccessTokenFromMemory, keptAccessToken } from "./keptAccessToken";
import { Setup } from "./Setup";
import { Unlock } from "./Unlock";

/** Chooses what the Candidate sees from the state of their Vault: first-visit setup, unlock, or the dashboard. */
export function VaultGate() {
  const { state, create, unlock, lock, startOver } = useVault();
  const lockApp = useCallback(() => {
    dropAccessTokenFromMemory();
    lock();
  }, [lock]);

  if (state.status === "unlocked") return <Dashboard vault={state.unlocked} onLock={lockApp} />;
  return (
    <main className="page">
      <h1 className="brand">Interview Helper</h1>
      {state.status === "unavailable" && (
        <p role="alert" className="notice-blocking">
          This browser won't let the app store data, so it can't keep your Scenarios. This can happen in a private window
          or when site data is blocked. Try a normal window, or allow site data for this site.
        </p>
      )}
      {state.status === "new" && (
        <Setup
          onComplete={(unlockKey, accessToken) =>
            create(unlockKey, async (unlocked) => {
              if (accessToken) await keptAccessToken(unlocked).keep(accessToken);
            })
          }
        />
      )}
      {state.status === "locked" && <Unlock onUnlock={unlock} onStartOver={startOver} />}
    </main>
  );
}

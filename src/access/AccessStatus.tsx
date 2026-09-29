import { useEffect, useState } from "react";
import type { UnlockedVault } from "../vault/vault";
import { AccessTokenPanel } from "./AccessTokenPanel";
import { accessTokenStore } from "./accessTokenStore";

const RECORD = "access-token";

/** Inside the app: the Access Token kept in the Vault, checked again after unlocking, or a way to add one. */
export function AccessStatus({ vault }: { vault: UnlockedVault }) {
  const [remembered, setRemembered] = useState<string | null | undefined>(undefined); // undefined while reading

  useEffect(() => {
    let current = true;
    void vault.get<string>(RECORD).then((token) => {
      if (current) setRemembered(token ?? null);
    });
    return () => {
      current = false;
    };
  }, [vault]);

  if (remembered === undefined) return null;
  return (
    <AccessTokenPanel
      remembered={remembered ?? undefined}
      onActive={(token) => {
        accessTokenStore.set(token);
        void vault.put(RECORD, token);
      }}
      onForget={() => {
        accessTokenStore.clear();
        void vault.delete(RECORD);
      }}
    />
  );
}

/** Keeps the Access Token from setup in the newly created Vault. */
export async function keepAccessToken(vault: UnlockedVault, token: string) {
  accessTokenStore.set(token);
  await vault.put(RECORD, token);
}

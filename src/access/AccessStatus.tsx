import { useMemo, useState } from "react";
import { useCancellableEffect } from "../hooks";
import type { UnlockedVault } from "../vault/vault";
import { AccessTokenPanel } from "./AccessTokenPanel";
import { keptAccessToken } from "./keptAccessToken";

/** Inside the app: the Access Token kept in the Vault, checked again after unlocking, or a way to add one. */
export function AccessStatus({ vault }: { vault: UnlockedVault }) {
  const kept = useMemo(() => keptAccessToken(vault), [vault]);
  const [remembered, setRemembered] = useState<string | null | undefined>(undefined); // undefined while reading

  useCancellableEffect(
    (isCurrent) => {
      void kept.recall().then((token) => {
        if (isCurrent()) setRemembered(token);
      });
    },
    [kept],
  );

  if (remembered === undefined) return null;
  return (
    <AccessTokenPanel
      remembered={remembered ?? undefined}
      onActive={(token) => void kept.keep(token)}
      onForget={() => void kept.forget()}
    />
  );
}

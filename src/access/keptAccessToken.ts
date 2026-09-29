// The one owner of the Candidate's Access Token. Its lasting copy is encrypted in the Vault (ADR 0001); a copy in
// memory is what the Model Gateway sends with each call. It's filled on unlock and emptied on lock, so neither copy
// can drift from the other.
import type { UnlockedVault } from "../vault/vault";

const RECORD_ID = "access-token";
let inMemory: string | null = null;

/** The token the Model Gateway should send right now, if any. */
export const accessTokenInUse = () => inMemory;

/** On lock: the token leaves memory with the key; its Vault copy stays for the next unlock. */
export function dropAccessTokenFromMemory() {
  inMemory = null;
}

/** The Access Token kept in this unlocked Vault. Once the Vault is locked, keeping or forgetting does nothing. */
export function keptAccessToken(vault: UnlockedVault) {
  return {
    /** Reads the stored token back into use; the caller then checks it with the Worker, which may be unreachable. */
    async recall() {
      const token = (await vault.get<string>(RECORD_ID)) ?? null;
      if (!vault.isLocked()) inMemory = token;
      return token;
    },
    async keep(token: string) {
      if (vault.isLocked()) return;
      inMemory = token;
      await vault.put(RECORD_ID, token);
    },
    async forget() {
      if (vault.isLocked()) return;
      inMemory = null;
      await vault.delete(RECORD_ID);
    },
  };
}

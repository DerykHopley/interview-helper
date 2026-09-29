// The Vault (spec #1; ADR 0001, ADR 0002): owns the Unlock Key and encrypts everything the app stores.
//
// From the Unlock Key and a random salt, HKDF-SHA256 derives two independent values: a check value, stored so a key
// can be verified before anything is decrypted, and a non-extractable AES-GCM key that encrypts each record. HKDF
// rather than a slow password hash is enough because the Unlock Key is 120 random bits, not a chosen passphrase.
// The AES key lives only in memory, inside the UnlockedVault; locking means dropping it.
import { fixConfusables } from "../../shared/crockford";
import type { Database } from "./indexedDb";

const META_ID = "vault";
type Meta = { salt: Uint8Array<ArrayBuffer>; check: Uint8Array<ArrayBuffer> };
type Sealed = { iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer };

export type UnlockedVault = {
  /** Drops the encryption key: every later get, put or delete is refused. */
  lock(): void;
  isLocked(): boolean;
  get<T>(id: string): Promise<T | undefined>;
  put(id: string, value: unknown): Promise<void>;
  delete(id: string): Promise<void>;
};

export type Vault = {
  /** Whether a Vault has been set up in this browser. */
  exists(): Promise<boolean>;
  /** First-visit setup: starts an empty Vault locked by this Unlock Key. */
  create(unlockKey: string): Promise<UnlockedVault>;
  /** Null when the key doesn't match; nothing is decrypted in that case. */
  unlock(unlockKey: string): Promise<UnlockedVault | null>;
  /** "Start over": deletes everything stored, readable or not, so setup can run again. */
  wipe(): Promise<void>;
};

export function createVault(db: Database): Vault {
  return {
    exists: async () => (await db.get<Meta>("meta", META_ID)) !== undefined,
    async create(unlockKey) {
      requestPersistentStorage();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const { check, key } = await derive(unlockKey, salt);
      await db.put("meta", META_ID, { salt, check } satisfies Meta);
      return unlocked(db, key);
    },
    async unlock(unlockKey) {
      const meta = await db.get<Meta>("meta", META_ID);
      if (!meta) return null;
      const { check, key } = await derive(unlockKey, meta.salt);
      if (!constantTimeEqual(check, meta.check)) return null;
      requestPersistentStorage(); // again, in case the browser said no before
      return unlocked(db, key);
    },
    wipe: () => db.clear(),
  };
}

/** Asks the browser not to evict the app's data (ADR 0001: Safari clears it after 7 days without a visit). The
 * browser may say no, and older ones can't be asked; either way the app carries on. */
function requestPersistentStorage() {
  void navigator.storage?.persist?.().catch(() => false);
}

function unlocked(db: Database, cryptoKey: CryptoKey): UnlockedVault {
  let key: CryptoKey | null = cryptoKey;
  const keyOrRefuse = () => {
    if (!key) throw new Error("The Vault is locked");
    return key;
  };
  // Each record's id is bound in as additional data, so a record copied under another id won't decrypt.
  const aad = (id: string) => new TextEncoder().encode(id);
  return {
    lock() {
      key = null;
    },
    isLocked: () => key === null,
    async get<T>(id: string) {
      const key = keyOrRefuse();
      const sealed = await db.get<Sealed>("records", id);
      if (!sealed) return undefined;
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: sealed.iv, additionalData: aad(id) }, key, sealed.data);
      return JSON.parse(new TextDecoder().decode(plain)) as T;
    },
    async put(id, value) {
      const key = keyOrRefuse();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plain = new TextEncoder().encode(JSON.stringify(value));
      const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(id) }, key, plain);
      await db.put("records", id, { iv, data } satisfies Sealed);
    },
    async delete(id) {
      keyOrRefuse();
      await db.delete("records", id);
    },
  };
}

/** Reads a typed or pasted key the way it was shown: case, spaces and hyphens don't matter, and O/I/L are forgiven. */
const normalise = (unlockKey: string) => fixConfusables(unlockKey.toUpperCase().replace(/[^0-9A-Z]/g, ""));

async function derive(unlockKey: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(normalise(unlockKey)), "HKDF", false, ["deriveBits", "deriveKey"]);
  const params = (info: string) => ({ name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode(`interview-helper ${info}`) });
  const check = new Uint8Array(await crypto.subtle.deriveBits(params("check"), material, 256));
  const key = await crypto.subtle.deriveKey(params("records"), material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return { check, key };
}

/** Compares without stopping at the first difference, so timing doesn't reveal how much of a key matched. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

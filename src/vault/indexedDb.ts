// A small Promise wrapper over the one IndexedDB database the app uses. It stores only what the Vault hands it:
// the Vault's own settings in "meta" and encrypted records in "records", both keyed by a string id.
const DB_NAME = "interview-helper";
const STORES = ["meta", "records"] as const;
type Store = (typeof STORES)[number];

export type Database = {
  get<T>(store: Store, id: string): Promise<T | undefined>;
  put(store: Store, id: string, value: unknown): Promise<void>;
  delete(store: Store, id: string): Promise<void>;
  /** Every entry whose id starts with `prefix`, in id order. */
  entries<T>(store: Store, prefix: string): Promise<{ id: string; value: T }[]>;
  /** Deletes everything in every store, in one transaction. */
  clear(): Promise<void>;
  close(): void;
};

export function openDatabase(): Promise<Database> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      for (const store of STORES) request.result.createObjectStore(store);
    };
    request.onerror = () => reject(request.error ?? new Error("Couldn't open storage"));
    request.onsuccess = () => resolve(wrap(request.result));
  });
}

function wrap(db: IDBDatabase): Database {
  /** Runs one transaction and settles when it commits, so a write is only "done" once it's durable. */
  function run<T>(stores: Store | readonly Store[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => IDBRequest<T> | void) {
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      const request = work(tx);
      tx.oncomplete = () => resolve(request?.result as T);
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("Storage transaction failed"));
    });
  }

  return {
    get: <T,>(store: Store, id: string) => run<T | undefined>(store, "readonly", (tx) => tx.objectStore(store).get(id)),
    put: (store, id, value) => run(store, "readwrite", (tx) => void tx.objectStore(store).put(value, id)),
    delete: (store, id) => run(store, "readwrite", (tx) => void tx.objectStore(store).delete(id)),
    async entries<T>(store: Store, prefix: string) {
      const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
      const [ids, values] = await Promise.all([
        run<string[]>(store, "readonly", (tx) => tx.objectStore(store).getAllKeys(range) as IDBRequest<string[]>), // ids are strings
        run<T[]>(store, "readonly", (tx) => tx.objectStore(store).getAll(range)),
      ]);
      return ids.map((id, i) => ({ id, value: values[i] }));
    },
    clear: () => run(STORES, "readwrite", (tx) => STORES.forEach((store) => tx.objectStore(store).clear())),
    close: () => db.close(),
  };
}

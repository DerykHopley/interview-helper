// Reads everything the app has written to browser storage, as raw text, for tests about what is (not) stored there.
// This looks under the app on purpose: the acceptance criteria are about storage itself (spec #4, seams agreed).

/** Every value in every IndexedDB store, with bytes decoded as text, plus localStorage and sessionStorage. */
export async function everythingStored(): Promise<string> {
  const databases = await indexedDB.databases();
  const parts: string[] = [];
  for (const { name } of databases) {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name!);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
    for (const store of db.objectStoreNames) {
      const values = await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction(store).objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
      });
      parts.push(...values.map(asText));
    }
    db.close();
  }
  for (const storage of [localStorage, sessionStorage]) {
    for (let i = 0; i < storage.length; i++) parts.push(storage.key(i)!, storage.getItem(storage.key(i)!)!);
  }
  return parts.join("\n");
}

/** Strings as they are; bytes decoded both as UTF-8 and as Latin-1, so no encoding hides plain text. */
function asText(value: unknown): string {
  if (typeof value === "string") return value;
  // Checked by tag, not instanceof: stored buffers can come from another realm (jsdom's versus Node's).
  const isBuffer = Object.prototype.toString.call(value) === "[object ArrayBuffer]";
  if (isBuffer || ArrayBuffer.isView(value)) {
    const bytes = ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : new Uint8Array(value as ArrayBuffer);
    return `${new TextDecoder().decode(bytes)}\n${String.fromCharCode(...bytes)}`;
  }
  if (value && typeof value === "object") return Object.values(value).map(asText).join("\n");
  return String(value);
}

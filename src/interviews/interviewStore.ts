// Interviews in the Vault: one encrypted JSON record each, `interview:<uuid>` (ADR 0004).
import type { UnlockedVault } from "../vault/vault";
import { interviewSchema, type Interview } from "./interview";

const PREFIX = "interview:";

export type SavedInterview = Interview & { id: string };

export function interviewStore(vault: UnlockedVault) {
  // Writes run one after another, and reads wait for them, so a list read just after leaving an Interview still
  // sees a save that was in flight.
  let writes: Promise<unknown> = Promise.resolve();
  const write = <T,>(run: () => Promise<T>) => {
    const done = writes.then(run, run);
    writes = done.catch(() => {});
    return done;
  };

  return {
    /** The Interviews in role order, and how many stored ones couldn't be read. */
    async list(): Promise<{ interviews: SavedInterview[]; unreadable: number }> {
      await writes;
      const records = await vault.list<unknown>(PREFIX);
      const interviews: SavedInterview[] = [];
      for (const record of records) {
        const parsed = record.readable ? interviewSchema.safeParse(record.value) : null;
        if (parsed?.success) interviews.push({ ...parsed.data, id: record.id });
      }
      interviews.sort((a, b) => a.role.localeCompare(b.role));
      return { interviews, unreadable: records.length - interviews.length };
    },
    async get(id: string): Promise<SavedInterview | null> {
      await writes;
      const parsed = interviewSchema.safeParse(await vault.get<unknown>(id));
      return parsed.success ? { ...parsed.data, id } : null;
    },
    /** Saves a new Interview, or replaces the one with this id. Returns its id. */
    save(interview: Interview, id: string = `${PREFIX}${crypto.randomUUID()}`) {
      const checked = interviewSchema.parse(interview);
      return write(() => vault.put(id, checked)).then(() => id);
    },
    /** Applies a change to the stored Interview, in turn with other writes, so two changes that overlap (e.g. two
     * Questions' Matches arriving together) both land. Resolves to the saved Interview. */
    update(id: string, change: (current: Interview) => Interview) {
      return write(async () => {
        const parsed = interviewSchema.safeParse(await vault.get<unknown>(id));
        if (!parsed.success) throw new Error("This Interview can't be read");
        const next = interviewSchema.parse(change(parsed.data));
        await vault.put(id, next);
        return { ...next, id };
      });
    },
    delete: (id: string) => write(() => vault.delete(id)),
  };
}

export type InterviewStore = ReturnType<typeof interviewStore>;

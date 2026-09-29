// Interviews in the Vault: one encrypted JSON record each, `interview:<uuid>` (ADR 0004).
import type { UnlockedVault } from "../vault/vault";
import { interviewSchema, type Interview } from "./interview";

const PREFIX = "interview:";

export type SavedInterview = Interview & { id: string };

export function interviewStore(vault: UnlockedVault) {
  return {
    /** The Interviews in role order, and how many stored ones couldn't be read. */
    async list(): Promise<{ interviews: SavedInterview[]; unreadable: number }> {
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
      const parsed = interviewSchema.safeParse(await vault.get<unknown>(id));
      return parsed.success ? { ...parsed.data, id } : null;
    },
    /** Saves a new Interview, or replaces the one with this id. Returns its id. */
    async save(interview: Interview, id: string = `${PREFIX}${crypto.randomUUID()}`) {
      await vault.put(id, interviewSchema.parse(interview));
      return id;
    },
    delete: (id: string) => vault.delete(id),
  };
}

export type InterviewStore = ReturnType<typeof interviewStore>;

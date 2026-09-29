import { useState } from "react";
import { useCancellableEffect } from "../hooks";
import type { Interview } from "./interview";
import type { InterviewStore, SavedInterview } from "./interviewStore";

export type OpenInterview =
  | { status: "loading" }
  | { status: "missing" } // deleted, or its record can't be read
  | { status: "ready"; interview: SavedInterview; position: number; move: (position: number) => void; save: (interview: Interview) => Promise<void> };

/** The Interview the Candidate has open, if any: read from the Vault, where its deck is, and saving changes. A save
 * that finishes after the Candidate has left (or opened another) is kept in the Vault but not shown. */
export function useOpenInterview(store: InterviewStore, id: string | null): OpenInterview | null {
  const [loaded, setLoaded] = useState<{ id: string; interview: SavedInterview | null } | null>(null);
  const [position, setPosition] = useState(0);

  useCancellableEffect(
    (isCurrent) => {
      setPosition(0);
      if (!id) return;
      store.get(id).then(
        (interview) => isCurrent() && setLoaded({ id, interview }),
        () => isCurrent() && setLoaded({ id, interview: null }),
      );
    },
    [store, id],
  );

  if (!id) return null;
  if (!loaded || loaded.id !== id) return { status: "loading" };
  const { interview } = loaded;
  if (!interview) return { status: "missing" };
  return {
    status: "ready",
    interview,
    position,
    move: setPosition,
    async save(next) {
      await store.save(next, id);
      // Only update the Interview this save was for, in case the Candidate has since opened another.
      setLoaded((shown) => (shown?.id === id ? { id, interview: { ...next, id } } : shown));
    },
  };
}

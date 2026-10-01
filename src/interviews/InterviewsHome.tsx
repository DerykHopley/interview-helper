import { useRef, useState } from "react";
import { useCancellableEffect } from "../hooks";
import type { Interview } from "./interview";
import type { InterviewStore, SavedInterview } from "./interviewStore";
import { countOf, unreadableNotice } from "../text";
import { gapCount } from "./gaps";
import { NewInterview } from "./NewInterview";
import { lastPractised, practisedLabel } from "./answers";

type Props = {
  store: InterviewStore;
  onOpen: (id: string) => void;
  /** Whether an Access Token is active, so a new Interview's Questions can be written. */
  accessActive: boolean;
  /** A model call found the Access Token expired. */
  onTokenExpired: () => void;
  /** A new Interview was saved; `generate` asks for its first Questions. */
  onCreated: (id: string, generate: boolean) => void;
};

/** The Interviews tab, the dashboard's home (D2): the Candidate's Interviews, and creating one. */
export function InterviewsHome({ store, onOpen, accessActive, onTokenExpired, onCreated }: Props) {
  const [interviews, setInterviews] = useState<SavedInterview[] | null>(null);
  const [unreadable, setUnreadable] = useState(0);
  const [creating, setCreating] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closeDrawer = () => {
    setCreating(false);
    opener.current?.focus(); // back to where the Candidate was
  };

  useCancellableEffect(
    (isCurrent) => {
      store.list().then(
        (result) => {
          if (!isCurrent()) return;
          setInterviews(result.interviews);
          setUnreadable(result.unreadable);
        },
        () => isCurrent() && setFailure("Couldn't open your Interviews. Lock the app and unlock it again."),
      );
    },
    [store],
  );

  async function create(interview: Interview, generate: boolean) {
    onCreated(await store.save(interview), generate);
  }

  async function remove(interview: SavedInterview) {
    if (!confirm(`Delete "${interview.role}" and its ${countOf(interview.questions.length, "Question")}? This can't be undone.`)) return;
    try {
      await store.delete(interview.id);
      setInterviews((await store.list()).interviews);
    } catch {
      setFailure(`Couldn't delete "${interview.role}". Try again.`); // only if the Vault is locked or storage fails
    }
  }

  if (!interviews) return failure ? <p role="alert" className="notice-blocking">{failure}</p> : null;
  return (
    <div className="home">
      <div className="bank-head">
        <h2 className="page-title">Interviews</h2>
        <button type="button" className="button-primary" ref={opener} onClick={() => setCreating(true)}>
          + New Interview
        </button>
      </div>
      {failure && (
        <p role="alert" className="notice-warn">
          {failure}
        </p>
      )}
      {unreadable > 0 && (
        <p role="alert" className="notice-warn">
          {unreadableNotice(unreadable, "Interview")}
        </p>
      )}
      {interviews.length === 0 && <p className="bank-hint">No Interviews yet. Create one by pasting a Job Spec.</p>}
      {interviews.length > 0 && (
      <table className="interviews" aria-label="Interviews">
        <thead>
          <tr>
            <th scope="col">Role</th>
            <th scope="col">Questions</th>
            <th scope="col">Gaps</th>
            <th scope="col">Last practised</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {interviews.map((interview) => {
            const gaps = gapCount(interview);
            return (
              <tr key={interview.id}>
                <th scope="row">
                  <span className="interview-role">{interview.role}</span>
                  {interview.company && <span className="interview-company">{interview.company}</span>}
                </th>
                <td>{interview.questions.length}</td>
                <td className={gaps > 0 ? "has-gaps" : undefined}>{gaps > 0 ? countOf(gaps, "Gap") : "—"}</td>
                <td className="last-practised">{practisedLabel(lastPractised(interview))}</td>
                <td>
                  <div className="actions">
                    <button type="button" className="button-secondary" onClick={() => onOpen(interview.id)}>
                      Practise
                    </button>
                    <button type="button" className="button-link" aria-label={`Delete ${interview.role}`} onClick={() => void remove(interview)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
      {creating && <NewInterview accessActive={accessActive} onTokenExpired={onTokenExpired} onCreate={create} onCancel={closeDrawer} />}
    </div>
  );
}

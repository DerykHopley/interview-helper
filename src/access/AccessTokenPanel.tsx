import { useEffect, useState, type FormEvent } from "react";
import { useModelGateway } from "../model-gateway/context";
import type { AccessStatus } from "../model-gateway/ModelGateway";
import { accessTokenStore } from "./accessTokenStore";

const MESSAGES = {
  invalid: "That token isn't recognised. Check it with whoever gave it to you.",
  expired: "That token has expired. Ask for a new one.",
};

/** Step 1 of setup (A2 checklist design): the Access Token from the Candidate's teacher or group. */
export function AccessTokenPanel() {
  const gateway = useModelGateway();
  const [status, setStatus] = useState<AccessStatus | null>(null);
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);

  // A token remembered from earlier in this tab is checked again, since it may have expired meanwhile.
  useEffect(() => {
    const stored = accessTokenStore.get();
    if (!stored) return;
    void gateway.checkAccess(stored).then((result) => {
      if (!result.ok) accessTokenStore.clear();
      setStatus(result.ok ? result : null);
    });
  }, [gateway]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    const result = await gateway.checkAccess(value.trim());
    setChecking(false);
    setStatus(result);
    if (result.ok) accessTokenStore.set(value.trim());
  }

  if (status?.ok) {
    return (
      <section>
        <h2>Access</h2>
        <p>
          Access Token for {status.label} is active until {status.expiresAt.toLocaleString()}.
        </p>
        <button type="button" onClick={() => { accessTokenStore.clear(); setStatus(null); setValue(""); }}>
          Use a different token
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)}>
      <h2>Access</h2>
      <label htmlFor="access-token">Access Token</label>
      <p>From your teacher or group. Lets the app use AI. Lasts 8 hours.</p>
      <input id="access-token" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false} />
      {status && !status.ok && <p role="alert">{MESSAGES[status.reason]}</p>}
      <button type="submit" disabled={!value.trim() || checking}>
        Continue
      </button>
    </form>
  );
}

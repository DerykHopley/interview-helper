import { useEffect, useState, type FormEvent } from "react";
import { useModelGateway } from "../model-gateway/context";
import { ModelGatewayError, type AccessStatus } from "../model-gateway/ModelGateway";
import { accessTokenStore } from "./accessTokenStore";

const MESSAGES = {
  invalid: "That token isn't recognised. Check it with whoever gave it to you.",
  expired: "That token has expired. Ask for a new one.",
  rememberedExpired: "Your Access Token has expired. Ask for a new one.",
  unreachable: "Couldn't reach the app's server. Check your connection and try again.",
};

type Active = Extract<AccessStatus, { ok: true }>;
type Outcome = { active: Active; message: null } | { active: null; message: string };

/** What to show after checking a token. `remembered` means it was stored earlier, not typed just now. */
function outcomeOf(result: AccessStatus | ModelGatewayError, remembered: boolean): Outcome {
  if (result instanceof ModelGatewayError) return { active: null, message: MESSAGES.unreachable };
  if (result.ok) return { active: result, message: null };
  if (result.reason === "invalid") return { active: null, message: MESSAGES.invalid };
  return { active: null, message: remembered ? MESSAGES.rememberedExpired : MESSAGES.expired };
}

/** Asks the Worker about a token; a failure to reach it comes back as the error rather than throwing. */
const checkWith = (gateway: ReturnType<typeof useModelGateway>, token: string) =>
  gateway.checkAccess(token).catch((e: unknown) => {
    if (e instanceof ModelGatewayError) return e;
    throw e;
  });

/** Step 1 of setup (A2 checklist design): the Access Token from the Candidate's teacher or group. The full
 * numbered checklist arrives with the Unlock Key in #4. */
export function AccessTokenPanel() {
  const gateway = useModelGateway();
  const [active, setActive] = useState<Active | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);

  // A token remembered from earlier in this tab is checked again, since it may have expired meanwhile.
  useEffect(() => {
    const stored = accessTokenStore.get();
    if (!stored) return;
    let current = true;
    void checkWith(gateway, stored).then((result) => {
      if (!current) return;
      const outcome = outcomeOf(result, true);
      if (outcome.active) accessTokenStore.set(stored);
      else if (!(result instanceof ModelGatewayError)) accessTokenStore.clear(); // keep it if we just couldn't ask
      setActive(outcome.active);
      setMessage(outcome.message);
    });
    return () => {
      current = false;
    };
  }, [gateway]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const token = value.trim();
    setChecking(true);
    try {
      const outcome = outcomeOf(await checkWith(gateway, token), false);
      if (outcome.active) accessTokenStore.set(token);
      setActive(outcome.active);
      setMessage(outcome.message);
    } finally {
      setChecking(false);
    }
  }

  if (active) {
    return (
      <section>
        <h2>Access</h2>
        <p>
          Access Token for {active.label} is active until {active.expiresAt.toLocaleString()}.
        </p>
        <button type="button" onClick={() => { accessTokenStore.clear(); setActive(null); setValue(""); }}>
          Use a different token
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)}>
      <h2>Access</h2>
      <label htmlFor="access-token">Access Token</label>
      <p>From your teacher or group. Lets the app use AI for a limited time.</p>
      <input id="access-token" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false} />
      {message && <p role="alert">{message}</p>}
      <button type="submit" disabled={!value.trim() || checking}>
        Continue
      </button>
    </form>
  );
}

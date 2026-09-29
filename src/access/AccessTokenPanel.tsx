import { useCallback, useState, type FormEvent } from "react";
import { useCancellableEffect, useLatest } from "../hooks";
import { useModelGateway } from "../model-gateway/context";
import { ModelGatewayError, type AccessStatus } from "../model-gateway/ModelGateway";

const MESSAGES = {
  invalid: "That token isn't recognised. Check it with whoever gave it to you.",
  expired: "That token has expired. Ask for a new one.",
  rememberedExpired: "Your Access Token has expired. Ask for a new one.",
  unreachable: "Couldn't reach the app's server. Check your connection and try again.",
};

export type Active = Extract<AccessStatus, { ok: true }>;
type Outcome = { active: Active; message: null } | { active: null; message: string };

/** What to show after checking a token. `remembered` means it was stored earlier, not typed just now. */
function outcomeOf(result: AccessStatus | ModelGatewayError, remembered: boolean): Outcome {
  if (result instanceof ModelGatewayError) return { active: null, message: MESSAGES.unreachable };
  if (result.ok) return { active: result, message: null };
  if (result.reason === "invalid") return { active: null, message: MESSAGES.invalid };
  return { active: null, message: remembered ? MESSAGES.rememberedExpired : MESSAGES.expired };
}

export const describeActive = (active: Active) =>
  `Access Token for ${active.label} is active until ${active.expiresAt.toLocaleString()}.`;

/** Asks the Worker about a token; a failure to reach it comes back as the error rather than throwing. */
const checkWith = (gateway: ReturnType<typeof useModelGateway>, token: string) =>
  gateway.checkAccess(token).catch((e: unknown) => {
    if (e instanceof ModelGatewayError) return e;
    throw e;
  });

type Props = {
  /** A token stored earlier, checked again on mount since it may have expired meanwhile. */
  remembered?: string;
  /** A token was accepted by the Worker. */
  onActive: (token: string, active: Active) => void;
  /** The token should no longer be kept: the Candidate replaced it, or the Worker now refuses it. */
  onForget?: () => void;
  /** Told whenever the panel shows a message (not recognised, expired, unreachable), or clears it. */
  onMessage?: (message: string | null) => void;
  /** Offers "I don't have one yet" (setup only). */
  onSkip?: () => void;
};

/** Entering and checking an Access Token (A2 checklist step 1, and inside the app). It keeps nothing itself: where
 * the token is kept is up to the caller. */
export function AccessTokenPanel({ remembered, onActive, onForget, onMessage, onSkip }: Props) {
  const gateway = useModelGateway();
  const [active, setActive] = useState<Active | null>(null);
  const [message, setShownMessage] = useState<string | null>(null);
  const reportMessage = useLatest(onMessage);
  const setMessage = useCallback(
    (m: string | null) => {
      setShownMessage(m);
      reportMessage.current?.(m);
    },
    [reportMessage],
  );
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);

  // The latest callbacks, so the recheck runs once per remembered token rather than on every render.
  const callbacks = useLatest({ onActive, onForget });

  useCancellableEffect((isCurrent) => {
    if (!remembered) return;
    void checkWith(gateway, remembered).then((result) => {
      if (!isCurrent()) return;
      const outcome = outcomeOf(result, true);
      if (outcome.active) callbacks.current.onActive(remembered, outcome.active);
      else if (!(result instanceof ModelGatewayError)) callbacks.current.onForget?.(); // keep it if we just couldn't ask
      setActive(outcome.active);
      setMessage(outcome.message);
    });
  }, [gateway, remembered, callbacks, setMessage]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const token = value.trim();
    setChecking(true);
    try {
      const outcome = outcomeOf(await checkWith(gateway, token), false);
      if (outcome.active) onActive(token, outcome.active);
      setActive(outcome.active);
      setMessage(outcome.message);
    } finally {
      setChecking(false);
    }
  }

  if (active) {
    return (
      <>
        <p className="status-ok">{describeActive(active)}</p>
        <button type="button" className="button-link" onClick={() => { onForget?.(); setActive(null); setValue(""); }}>
          Use a different token
        </button>
      </>
    );
  }
  return (
    <form className="form" onSubmit={(e) => void submit(e)}>
      <label htmlFor="access-token" className="visually-hidden">
        Access Token
      </label>
      <input
        id="access-token"
        className="field field-mono"
        placeholder="IH-XXXXXX-XXXXXXX-XXXXXXXXXXXXXXXX"
        aria-invalid={message !== null}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {message && <p role="alert" className="error">{message}</p>}
      <button type="submit" className="button-primary" disabled={!value.trim() || checking}>
        Continue
      </button>
      {onSkip && (
        <button type="button" className="button-link" onClick={onSkip}>
          I don't have one yet
        </button>
      )}
    </form>
  );
}

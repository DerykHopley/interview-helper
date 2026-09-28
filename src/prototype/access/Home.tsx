// PROTOTYPE — stand-in for "inside the app" once unlocked, shared by A1 and A2 (A3 uses its own table as home).
// It isn't what's being judged; it shows the Access Token status and the lock.
import { hoursLeft, type Access } from "./access";

export function Home({ access, onAddToken }: { access: Access; onAddToken: () => void }) {
  const { token, tokenExpired, demoData } = access;
  return (
    <div className="ac-home">
      <div className="ac-home-bar">
        <span className="ac-home-brand">Interview Helper</span>
        <span className={`ac-chip ${token ? "is-ok" : "is-warn"}`}>{token ? `Access · ${hoursLeft(token)}h left` : tokenExpired ? "Access expired" : "No Access Token"}</span>
        <button className="ac-lock" onClick={access.lock} title="Lock now">🔒 Lock</button>
      </div>
      {!token && (
        <div className="ac-banner">
          <strong>{tokenExpired ? "Your Access Token has expired." : "AI features are off."}</strong>{" "}
          {tokenExpired ? "Ask for a new one to find Matches again." : "Add an Access Token to find Matches and generate Questions."}{" "}
          Your stories still work.
          <button onClick={onAddToken}>{tokenExpired ? "Enter a new token" : "Add Access Token"}</button>
        </div>
      )}
      <div className="ac-home-body">
        <div className="ac-home-title">Unlocked</div>
        <p>Your stories are open{demoData ? ", with demo stories added (labelled demo)" : ""}. The app locks itself after 15 minutes without use.</p>
        <a className="ac-primary" href="/?variant=K1">Go to your Interviews →</a>
      </div>
    </div>
  );
}

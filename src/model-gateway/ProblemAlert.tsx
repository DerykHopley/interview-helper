/** Why a model call failed, with its fixes: a new Access Token when that's the cause, and Try again. Shared by the
 * screens that call a model in turn, such as co-writing and re-matching after it (#12, #13). */
export function ProblemAlert({ text, needsToken = false, onNeedToken, onRetry }: { text: string; needsToken?: boolean; onNeedToken: () => void; onRetry: () => void }) {
  return (
    <div role="alert" className="notice-warn">
      <p>{text}</p>
      <div className="actions">
        {needsToken && (
          <button type="button" className="button-secondary" onClick={onNeedToken}>
            Enter a new token
          </button>
        )}
        <button type="button" className="button-secondary" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}

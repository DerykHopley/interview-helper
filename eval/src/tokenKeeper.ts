// The report's Access Token, kept fresh: a run of several models can outlast one token (it did, on 2026-09-30, when
// the last model and the reason judge failed with expired_token), so a new one is minted when the current one nears
// expiry. A token given in ACCESS_TOKEN is used as it is.
export function tokenKeeper({
  given,
  mint,
  lifetimeMs,
  marginMs,
  now = Date.now,
}: {
  given?: string;
  mint: (expiresAt: Date) => Promise<string>;
  lifetimeMs: number;
  /** Mint a new one once less than this is left. Longer than any single stretch between `fresh()` calls. */
  marginMs: number;
  now?: () => number;
}) {
  let token = given ?? "";
  let expiresAt = 0;
  return {
    /** Makes sure the token has more than the margin left. Call before each stretch of calls. */
    async fresh() {
      if (given || (token && expiresAt - now() > marginMs)) return;
      expiresAt = now() + lifetimeMs;
      token = await mint(new Date(expiresAt));
    },
    current: () => token,
  };
}

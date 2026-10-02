// Minting an Access Token from a local script: `npm run token` for a group, `npm run local` for this machine (#63).
import { mintAccessToken } from "../worker/src/accessToken";

/** A token for `label` lasting `hours`, signed with `secret`, and when it expires. */
export async function mintFor(label: string, hours: number, secret: string) {
  const expiresAt = new Date(Date.now() + hours * 3_600_000);
  return { token: await mintAccessToken({ label, expiresAt, secret }), expiresAt };
}

# Access Tokens

An Access Token lets a group use the app's AI features for a limited time. Your stored data has nothing to do with it: that's protected by your own Unlock Key ([ADR 0002](adr/0002-unlock-key-separate-from-access-token.md)).

Minting one is a **manual step for the app owner**, on their own machine, so only someone who knows the Worker's `ACCESS_TOKEN_SECRET` can create tokens. There's no web page for it.

## Minting a token

```sh
npm run token -- --label cohort1              # lasts 8 hours (the default)
npm run token -- --label cohort1 --hours 24   # up to 168 hours (7 days)
```

It prints the token, for example `IH-COHORT1-1NBP7RK-PH6XVCZGFXZXAM9R`, and when it expires. Share it with the group, who paste it into the app's **Access Token** field.

- **Label:** names the group in the Worker's logs. Use lowercase letters and digits only, with no hyphens: `cohort1`, not `cohort-1`.
- **Hours:** how long the token lasts, 8 by default. The Worker refuses any token that would last longer than 7 days.
- **Signing secret:** the script signs with `ACCESS_TOKEN_SECRET` from your environment, or, if that isn't set, from `worker/.dev.vars`. To mint tokens for the deployed Worker, use the same value you gave it:

  ```sh
  ACCESS_TOKEN_SECRET=<the deployed secret> npm run token -- --label cohort1
  ```

## Revoking tokens

Tokens can't be revoked one at a time. To end every outstanding token at once, change the Worker's `ACCESS_TOKEN_SECRET` (for the deployed Worker, `wrangler secret put ACCESS_TOKEN_SECRET`). Then mint new tokens with the new secret.

## Why the signature is 80 bits

The token's signature is HMAC-SHA256 cut to its first 80 bits. RFC 2104 §5 suggests keeping at least half the hash (128 bits), which would make the signature 26 characters instead of 16. The shorter token was chosen so it can be read out or typed. To forge one, an attacker has to guess the signature by sending requests to the Worker, one guess per request, and 2^80 guesses can't happen before a token expires (7 days at most).

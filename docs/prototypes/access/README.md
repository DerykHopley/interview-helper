# Access screens — prototype decisions

Question: what should the Access Token, Unlock Key setup, unlock and Start over screens look like (ADR 0002, spec #1 stories 8–23)?

Prototype code lives on the throwaway branch `prototype/access`, not on main. It runs at `/prototype/access` (`npm run prototype:access`). Everything is in memory: nothing is encrypted or stored.

To try each situation, open the prototype bar's **state** panel. It can jump to first visit, returning (locked), token expired or no token; simulate 15 minutes of inactivity (which locks the app); or expire the token. It also lists the sample tokens:
- `IH-COHORT1-7Q2K-M9XD` is valid.
- `IH-COHORT1-0X9P-4TRW` has expired.
- Anything else is not recognised.

On a returning visit the stored Unlock Key is `7KQF-M2XD-9HRT-4VNC-P8WB-3JZE`.

## Round 1 — 2026-09-28

All three variants use the same form pieces, so the wording is identical and only the layout differs:
- Access Token entry, with separate "not recognised" and "expired" messages.
- Unlock Key reveal, with Copy, Download .txt, a "we only show this once" warning, and an "I've saved it" checkbox before continuing.
- Unlock, with "that key doesn't match".
- Start over, which only goes ahead after you type DELETE.
- Own stories or demo stories.

| Variant | Galaxy S25 (360×780) | Desktop |
|---|---|---|
| A1 — Card on the table: one card at a time on the Interview view's dark table (welcome → Access Token → Unlock Key → how to start). The Unlock Key card is dark and the Start over card is red. | [welcome](round-1/s25-A1-welcome.png) · [key](round-1/s25-A1-key.png) · [locked](round-1/s25-A1-locked.png) · [start over](round-1/s25-A1-start-over.png) · [inside, token expired](round-1/s25-A1-home-expired.png) | [key](round-1/desktop-A1-key.png) |
| A2 — Checklist: the whole setup on one page as three numbered steps, each with a one-line reason. The current step is open and finished steps fold up into a summary. | [token](round-1/s25-A2-token.png) · [key](round-1/s25-A2-key.png) · [start over](round-1/s25-A2-start-over.png) | [key](round-1/desktop-A2-key.png) |
| A3 — Keyring: the two secrets are two objects on the table, a ticket (Access Token) and a key (Unlock Key), each showing its own state. Tap one to open its panel. The same table is also the home screen, where the ticket shows as EXPIRED and you can lock. | [first visit](round-1/s25-A3-first.png) · [key panel](round-1/s25-A3-key.png) · [token expired](round-1/s25-A3-expired.png) | [key panel](round-1/desktop-A3-key.png) |

A1 and A2 share a simple stand-in for the inside of the app (Access status, Lock, an expired-token banner, and a link to the Interview view). It isn't part of what's being judged.

**Decision:** _pending_

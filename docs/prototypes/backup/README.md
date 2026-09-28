# Backup page — prototype decisions

Question: what should the Backup tab look like? It covers Scenario Export and import, Pack import, the backup reminder and persistent storage (spec #1 stories 22–23, 42–46, 51–54; issues #6 and #7).

The Backup page is a tab of the chosen dashboard (D2), so the variants are built inside the real D2 page. Prototype code lives on the throwaway branch `prototype/backup`, not on main. It runs at `/prototype/backup` (`npm run prototype:backup`). Nothing is encrypted or read from disk:
- "Choose a file" opens a list of sample files, so every outcome can be tried.
- "Download backup file" saves a placeholder file.

**Sample files**
| File | What happens |
|---|---|
| `interview-helper-2026-09-20.ihx` | A backup made with this device's key: 6 stories, 4 already here. |
| `old-laptop-backup.ihx` | A backup made with a different Unlock Key. You're asked for that key, and the state panel shows it. |
| `product-engineer-pack.zip` | A valid Pack. |
| `broken-pack.zip` | Rejected, with the reason. |
| `cv.pdf` | Not a file this app can read. |

**URL options:** `?backup=recent` starts backed up. `?storage=denied` starts without persistent storage. `?pick=<n>` opens the import flow with sample file n.

## Round 1 — 2026-09-28

All three variants use the same import flow, so only the layout differs:
- **Backup files:** the file is recognised, and if it was made with another key you're asked for that key, with "That key can't open this file" if it's wrong. It then shows how many stories will be added, e.g. "6 stories in this file. 2 new will be added; 4 you already have will be skipped". Nothing you have is changed.
- **Packs:** a preview of what's inside (instructions, Questions, Example Scenarios), noting that Example Scenarios are "shown as examples only, never matched as your stories". A broken Pack is rejected with the reason, and nothing changes.
- **Other files:** anything else gets "That isn't a file this app can read".

| Variant | Desktop | Galaxy S25 (360×780) |
|---|---|---|
| X1 — Three panels: settings-style. Back up and Restore sit side by side, with Packs below, and each panel runs its own flow in place. | [page](round-1/desktop-X1.png) · [restoring](round-1/desktop-X1-restore.png) | [page](round-1/s25-X1.png) |
| X2 — One drop zone: a large status card at the top ("Your stories aren't backed up" with Back up now), then one "Bring something in" area that accepts any file and works out whether it's a backup or a Pack, then Your Packs and a short History. | [page](round-1/desktop-X2.png) · [backed up](round-1/desktop-X2-backedup.png) · [different key](round-1/desktop-X2-otherkey.png) · [Pack preview](round-1/desktop-X2-pack.png) | [page](round-1/s25-X2.png) · [broken Pack](round-1/s25-X2-badpack.png) |
| X3 — Pick a task: "What do you want to do?" with three large choices (Back up, marked Recommended when you've never backed up; Restore; Add a Pack). Choosing one opens a short guided flow with a Back link, under a slim status line. | [page](round-1/desktop-X3.png) · [restore flow](round-1/desktop-X3-restore.png) | [page](round-1/s25-X3.png) |

**Decision:** _pending_

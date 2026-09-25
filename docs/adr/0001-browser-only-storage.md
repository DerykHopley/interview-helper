# Candidate data lives only in the browser

Each Candidate's Scenarios, Interviews and drafts are stored in their own browser, never on our server. There are no user accounts; access to the app is controlled by expiring access tokens that only gate LLM calls. We chose this because the audience is a small group with short-lived access, the budget is close to zero, and career stories are personal data we would rather never hold.

## Consequences

- Nothing syncs between devices; a Candidate moves or backs up their Scenarios with a Scenario Export.
- Data can be lost when the browser clears site data (Safari evicts after 7 days without a visit), so the app requests persistent storage and reminds Candidates to export.
- Teacher visibility into a Candidate's work, and anything that needs history across devices, would require revisiting this decision.
- Stored data is still encrypted at rest — browser-only storage is not a reason to keep plain text.

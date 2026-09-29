# Scenarios are stored as Markdown, Interviews as JSON

Both are kept in the Vault the same way: one encrypted record each, checked by a Zod schema on every read. What differs is the text inside. A Scenario is stored in the Scenario format, Markdown with a YAML header, because that format is shared: people write and read it by hand, and the same shape goes into Packs, Scenario Exports and the Evaluation Set. An Interview is stored as JSON, because it is the app's own working state for one job. Nobody writes it by hand and it never leaves the Vault, and it is nested and grows with each ticket: Questions now, then Matches and the Gap flag (#10), the picked Scenario (#11), and each Answer and its Feedback (#31, #32). Using Markdown for Interviews too was considered and rejected, since it would mean inventing a layout for structured data that no person reads.

## Consequences

- Two stored formats: `scenarioFormat.ts` for Scenarios, and a Zod schema for Interviews. Both reject a record that doesn't parse, and the screen reports it rather than failing.
- A Pack's Questions are copied into a new Interview when the Pack is chosen (#7). A Pack's file format and the Interview's stored format don't have to match.
- Adding a field to an Interview (a pick, an Answer) means extending its schema with a default, so records saved before the change still read.

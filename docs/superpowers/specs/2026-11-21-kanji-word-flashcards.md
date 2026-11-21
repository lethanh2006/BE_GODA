# Learn the vocabulary examples from N4 kanji lessons

The user authorizes implementation and data import. Each small vocabulary example under a kanji must become an independent flashcard with Japanese, kana and Vietnamese meaning, within the existing chapter. Keep the existing deck URLs, authentication boundaries and independent per-user FSRS progress.

Use the complete source already imported into the backend catalog; verify against the authenticated Dung Mori lesson. Expand kanji examples server-side, repair three source rows where the reading was embedded in the Vietnamese field, and deduplicate only identical term + reading within one chapter. Different readings remain separate cards. Stable word IDs must survive source reordering. Do not assign compound words the parent character's Han-Viet reading.

Keep old character rows and review history in the database but exclude them from learning, counts, practice and review queues. Insert new word cards with new schedules. Existing vocabulary cards remain unchanged. No schema migration or frontend redesign is needed.

Alternatives: adding mixed character/word cards leaves character-only prompts in the study flow; deleting character rows loses progress. Retaining those rows while selecting current cards matches the request and preserves history.

Cron: inspect the disabled cron-job.org job, history and live health endpoint. Re-enable only after testing, use the existing DB-free liveness route, allow Render cold-start time, and verify a manual run. Record any infrastructure error that cannot be established from the available logs.

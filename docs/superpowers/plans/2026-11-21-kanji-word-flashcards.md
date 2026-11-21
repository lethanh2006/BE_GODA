# Kanji vocabulary flashcards implementation plan

**Goal:** Turn every N4 kanji vocabulary example into a study card without losing existing progress, and inspect/repair the keep-alive job.
**Architecture:** Derive word cards from the backend catalog and keep retired character rows out of all active deck operations. Use existing authenticated APIs and UI.
**Tech Stack:** NestJS, TypeORM, PostgreSQL, Vitest.
**Spec:** ../specs/2026-11-21-kanji-word-flashcards.md

## Constraints and review focus
- Keep IDs and schedules for existing vocabulary cards; stable new word IDs independent of parent/index.
- Deduplicate by term and reading; retain homographs with different readings and merge distinct meanings.
- Filter retired characters only for matching Dung Mori kanji decks; never filter unrelated private content.
- Direct chapter links and practice must provision upgraded cards; repeated/concurrent provisioning must not duplicate cards.
- Keep counts, detail, learning, practice and review consistent; retired rows/history remain stored.

## Tasks
- [x] Add catalog transformation tests (all chapters, malformed split, duplicates, homographs, stable IDs), observe failures, implement `dung-mori-data.ts`.
- [x] Update catalog provisioning and deck operations to exclude retired rows. Extend Postgres integration tests for old progress, direct upgrade, private collisions, counts, practice and review. Run on a dedicated local test database.
- [x] Run backend tests, type/build/lint checks and review the diff. Verify production data and deployment where authorized and available.
- [x] Inspect cron history/configuration, test the endpoint, repair the existing job and verify a manual execution.

## Findings
- Existing source: 63 lessons, 965 cards, including 200 character cards with 495 vocabulary occurrences.
- API liveness currently returns HTTP 200. GitHub fallback is active; one recorded failure had three HTTP 502 responses over 21 seconds. Scheduled fallback runs are hours apart despite a five-minute cron expression.
- Frontend has substantial existing uncommitted work; leave it intact.

## Verification and delivery ledger
- Fetched all 19 authenticated Dung Mori kanji lessons on 2026-11-21; all 200 source character records match the existing imported source. Raw refresh stays in ignored `.cache/dungmori/kanji-2026-11-21.json`.
- Expanded to 471 vocabulary cards, including distinct readings of 降ります; total catalog 1,236 cards.
- Unit/backend suite: 152 passed, 5 skipped (database-gated cases). Dedicated Postgres catalog integration: 2 passed, including concurrent upgrade, retained old schedules, private source-ID collisions, active-only grading and retired-card rejection.
- Backend build and type-aware lint passed. Independent review found no actionable issues.
- Cron job 8781417 re-enabled; response storage enabled. Test run from cron-job.org returned HTTP 200 in 257 ms. Existing `*/5 1-12 * * 1-6` UTC schedule and notifications preserved. Timeout remains the service maximum of 30 seconds. Historical Render 502 root cause cannot be established from cron/GitHub HTTP status logs alone.
- Delivery uses an origin/master-based checkout because the existing local branch has eight unrelated video commits. Only this task's commit is included in the deployment.

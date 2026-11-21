# N4 grammar support implementation plan

**Goal:** Add Han-Viet to word flashcards and guided practical N4 grammar lessons aligned with chapters 15–33.
**Architecture:** Backend-only teaching catalog and grading; per-user per-question progress; authenticated Next.js study UI using Goda's existing components.
**Tech Stack:** NestJS, TypeORM/Postgres, Next.js 16/React 19, Vitest, browser verification.
**Spec:** ../specs/2026-11-21-n4-grammar-support.md

## Constraints and review focus
- Preserve existing flashcard identities, schedules and pending local work.
- Check source/chapter alignment; explanations and exercises must be original and unambiguous.
- Do not send answer keys before a submitted answer. Reject invalid/duplicate option indexes; keep user progress isolated and concurrent attempt updates atomic.
- Resume study and retry wrong questions; no blank or dead-end states on loading/failure/unknown chapters.
- Keyboard-accessible interactions; sentence ordering without drag-and-drop; long Japanese text and Vietnamese copy fit mobile screens.

## Tasks
- [x] Extract source outline and prepare reviewed lesson catalog; validate all chapter/question IDs, complete formulas/examples/explanations and solvable exercises.
- [x] Generate a bundled Han-Viet lookup, test compounds and fallback at serialization without changing schedules.
- [x] Add progress migration/entity and authenticated grammar service/controller; test grading, answer redaction, isolation, retries and concurrent updates on Postgres.
- [ ] Build the library and guided lesson/practice screens in an isolated frontend checkout. Link navigation and N4 chapter groups; preserve unrelated working-tree changes.
- [ ] Run builds, focused/full tests, independent review and mobile/keyboard browser checks. Deploy only these changes, then verify live lessons, Han-Viet and persistence with a disposable account.

## Review and verification ledger
- Authenticated outline fetched for all 44 grammar groups, chapters 15–33. Only titles and lesson URLs retained in the outline; app explanations and exercises are original.
- Content review: corrected adjective past conjugation, ambiguous distractors, indirect-speech cue and volitional irregular; added a focused past-discovery topic. Final catalog: 71 patterns / 142 questions, all with two examples and explanatory feedback.
- Natural Japanese word order: 25 reviewed alternative sequences accepted server-side and hidden from initial payloads. Added a regression test that failed before the grading fix and passed afterward.
- Replaced order-exercise feedback for all 71 topics with explanations for the actual assembled sentence. Added contextual furigana offline; no tokenizer dependency introduced to production.
- Han-Viet: all 471 active kanji-vocabulary cards have readings. Fallback at serialization preserves persisted card IDs and every FSRS field.
- Backend suite: 166 passed, 6 database-gated skips; dedicated Postgres grammar integration passed, including concurrent attempt increments and account isolation. Backend build and type-aware lint passed.
- Frontend review found stale cached progress on soft return and a wrong-topic link during chapter retries. Both are being verified in browser after targeted fixes.
- Frontend baseline Next 16.4.2 security nudge was verified against npm audit and official Next release/advisories. Patched Next and eslint-config-next to 16.4.5; production dependency audit now reports zero vulnerabilities. No unrelated pending audio/video changes are included in deployment.

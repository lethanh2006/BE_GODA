# N4 grammar support and Han-Viet flashcards

User requests Han-Viet on flashcard backs and clear practical grammar support, and explicitly chooses to follow the existing N4 chapters rather than restart N5. Prior authorization covers implementation, source access and deployment.

- Fill Han-Viet for the newly derived kanji vocabulary cards using the project's kanji/Unihan data and reviewed common readings. Existing backs already render the field. Keep card UUIDs and FSRS history. Apply fallback at API serialization so existing accounts benefit immediately without destructive content reimports.
- Fetch the authenticated Dung Mori N4 grammar outline for chapters 15–33. Keep only lesson titles and source links; author the Vietnamese teaching explanations, examples and practice independently. Never publish account data, session information or copied video materials.
- Add an authenticated grammar area linked from navigation and from each N4 vocabulary chapter. Each chapter offers a guided sequence: concise usage, explicit conjugation recipe, original translated examples, a common mistake and immediate practice with explanations. Retain the existing Goda red/navy visual language and components; one concept at a time, readable on phones.
- Offer selection and sentence ordering practice, explanations after checking, repeat wrong questions and persist progress per user on the backend so switching devices works. Validate and grade against canonical server data; no answer keys in initial lesson responses. Account isolation applies to all progress operations.
- Use a small new progress table, a reversible additive migration, and existing NestJS/TypeORM/Next.js tools. Do not touch unrelated pending video/audio work. Test migrations and ownership on a dedicated local database; verify keyboard/mobile behavior and deployed API/UI using disposable test data.

Approach: existing backend/server-graded content and progress fits authenticated Goda and durable study history. Client-only progress would be lost across devices; embedding this into vocabulary cards would not teach sentence construction.

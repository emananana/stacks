# Milestone 1 verification

Checked locally on macOS arm64, Node 24.14.1 and Python 3.10.0.

## Passed

- 41 backend tests: ISBN-10/13 checksums and canonicalization, 979 handling, invalid characters, provider normalization, sparse metadata, malformed responses, timeout/network/throttling errors, cache decisions, provider fallback, input rejection before I/O, liveness, and HTTP error envelopes.
- Ruff lint and formatting checks.
- Initial Alembic revision compiled to PostgreSQL SQL in offline mode.
- A live Open Library adapter lookup for `0140328726`, returning `Fantastic Mr. Fox`, authors, cover, publisher, publication date, and page count.
- Generated OpenAPI and TypeScript contracts; TypeScript compilation; Expo SDK dependency validation; Expo web export and iOS/Android Hermes bundle exports.
- Browser interaction and visual inspection at a 390 × 844 viewport: initial form, ISBN checksum error, actual backend database-unavailable error, loading, successful metadata/cover rendering, equivalent ISBN cache response, and scrolling through publication details.

The successful browser lookup used the real API/service/provider layers with a temporary in-memory repository double because PostgreSQL could not start here. That helper is outside this repository. It is not an alternate production database and does not verify PostgreSQL persistence.

## Not verified here

- Seven PostgreSQL integration tests were skipped. The environment has no Docker runtime, and an attempted temporary native PostgreSQL instance was blocked by the execution sandbox's shared-memory restriction (`shmget: Operation not permitted`). Migration upgrade/downgrade, model drift checks, concurrent inserts, author reuse, physical-copy constraints, and the full PostgreSQL-backed HTTP flow must run in CI or locally using the README instructions.
- CI has been authored, not run on GitHub.
- iOS/Android device or simulator execution, native keyboard behavior, large system text, and VoiceOver/TalkBack require device checks. Web preview is not proof of native behavior.

## Dependency notes

The tested versions are recorded in backend `requirements.lock`, mobile `package-lock.json`, and tooling `package-lock.json`. The TypeScript API generator is isolated because its peer dependency currently targets TypeScript 5 while Expo SDK 57 uses TypeScript 6.

The backend test client currently emits upstream Starlette/httpx deprecation warnings; tests pass. A future test-client dependency update can remove them.

`npm audit` reported 10 moderate transitive findings in Expo's build-tool dependency chain, rooted in the `uuid` buffer-bounds advisory through `xcode`. The suggested full automatic fix downgrades Expo to SDK 46, so no breaking downgrade or untested transitive override was applied. Track the upstream Expo/xcode dependency update before release; this is not a claim of a clean dependency security audit.

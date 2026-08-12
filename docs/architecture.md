# Veil architecture

## Boundaries

Veil uses a deliberately small local-first stack. `app/` supplies the document and application entry. `src/app/VeilApp.tsx` owns database readiness, onboarding, PWA state, and primary navigation. Feature screens compose reusable controls and consume live IndexedDB queries. Repositories own entity persistence. Services own computations and operations that span repositories or tables.

The permitted dependency direction is UI → hooks/services → repositories → `VeilDatabase`. Repository and service modules have no dependency on React, which keeps scheduling, persistence, and backup behavior deterministic in tests.

## Application lifecycle

1. The document applies a saved light/dark preference before first paint.
2. `VeilApp` opens IndexedDB and renders a friendly error state if initialization fails.
3. A new database seeds category definitions and a singleton preferences record only.
4. First-launch onboarding explains local storage and optionally creates generic AM/PM routines.
5. After onboarding, Today is the default view. Other primary features are loaded on demand.
6. In production, the service worker registers after mount and announces offline state without blocking local workflows.

## Persistence and transactions

Dexie supplies typed tables, indexed reads, transactions, and live queries. Multi-record operations use transactions where partial state would be harmful:

- saving a routine together with ordered steps and its schedule;
- duplicating or deleting a routine and related records;
- creating a routine session from step snapshots;
- resolving a session step and recalculating aggregate progress;
- removing media only after checking remaining references;
- replacing or merging all supported backup tables.

Dates shown as calendar days use local `YYYY-MM-DD` keys. Events retain full ISO timestamps. IDs are generated independently of record order, and explicit numeric `order` fields define routine-step sequencing.

## Scheduling and Today

Scheduling is a pure service. Daily rules always match; weekday rules match local weekday numbers; interval rules compare calendar-day distance from an anchor; manual rules never auto-select. Disabled and archived routines are excluded. The current period uses configurable morning/evening boundaries, and users can override both period and chosen routine.

Today finds or creates one in-progress session for the chosen routine, local day, and period. Session steps are snapshots, so later edits do not rewrite history. Completing, skipping, or undoing a step persists immediately and updates the session counters and status. All-resolved sessions are marked complete; undoing reopens them.

User-created incompatibility pairs are checked against visible routine products/steps. The result is always presented as the user’s personal reminder, never a medical fact.

## Media lifecycle

The browser decodes a chosen image, bounds its dimensions, creates a smaller thumbnail, and encodes a practical WebP/JPEG representation. The `media` table stores both blobs and metadata. Product, journal, and progress records reference media IDs; interfaces use thumbnails in collections and full images only in focused views. Temporary object URLs are revoked during cleanup.

Deleting a record removes media only when no other record references it. Decode, canvas, or quota failures are translated into actionable product messages.

## Backup trust boundary

Backup import is treated as untrusted input. Validation completes before the database transaction begins. It checks archive readability, relative paths, exact Veil identity, supported format/schema versions, required arrays, media descriptors, and every declared image. Replace clears only Veil tables inside the transaction. Merge performs primary-key collision checks per table and keeps existing records.

The archive contains no executable content. Validation errors and transaction failures are surfaced without raw stack traces.

## PWA cache boundary

IndexedDB is the source of truth for user records; Cache Storage contains only application resources. Navigation is network-first so releases are discovered promptly. Previously cached static assets can serve while offline. Cache versions are namespaced with `veil-`, and activation removes only older Veil caches.

Service-worker code is intentionally independent of user records and never reads or copies IndexedDB.

## Test boundaries

- Pure unit tests: date keys, period selection, schedule matching, PAO status, progress totals, and reminder language.
- Repository integration tests: product lifecycle, routine/session transactions, category seeding, media-reference cleanup.
- Backup tests: archive construction, validation failures, merge collision behavior, and replace restore.
- Component tests: theme behavior, onboarding, and the persisted Today completion path.
- Production smoke tests: built HTML metadata, viewport, manifest, icons, and service-worker assets.

All database tests use a unique `fake-indexeddb` database and close/delete it after the test.

# Veil implementation plan

## Product objective

Veil will be an iPhone-first, account-free skincare routine tracker that answers “What skincare am I supposed to do right now?” immediately. It will be a client-only Progressive Web App: all durable user data and photos live in IndexedDB, small display preferences live in localStorage, and the application shell remains available offline after the first successful load.

The core release is considered complete only when the daily loop—open Veil, see the applicable AM or PM routine, complete or skip steps, add a note, and find the saved session in history—is fast, reliable, accessible, and polished on narrow iPhone viewports.

## Technology choices

- React 19 and strict TypeScript on the bundled Vite/vinext runtime.
- CSS variables and authored CSS for the visual system; no heavy component framework.
- Dexie for typed IndexedDB access, schema versioning, transactions, and live queries.
- date-fns for local date calculations and formatting.
- Lucide React for a consistent, lightweight icon system.
- JSZip for validated, portable `.zip` backups.
- Vitest, React Testing Library, user-event, jsdom, and fake-indexeddb for unit and integration coverage.
- A locally registered service worker plus a web app manifest for installability and offline caching.
- Browser-native file, storage estimation, image canvas, history, and sharing APIs with graceful fallbacks.

No backend, remote API, account system, analytics service, cloud database, or server-owned user state will be added.

## Application architecture

The dependency direction is:

```text
Screens and components
        ↓
Feature hooks and application services
        ↓
Typed repositories
        ↓
Dexie database / IndexedDB
```

React components will not issue arbitrary IndexedDB mutations. Repository functions own persistence, application services own multi-entity operations such as finishing a routine or restoring a backup, and UI hooks expose loading, success, and recoverable error states.

The main application will be a client-side app shell mounted from the vinext page. Primary tabs stay mounted through a lightweight URL-aware view router so bottom navigation, sheets, and browser history work without requiring server navigation. Details and editors use full-height mobile sheets or focused views, preserving a native-feeling single-app experience and a dependable offline entry point.

## Planned folder structure

```text
app/
  layout.tsx                 document metadata and global shell
  page.tsx                   Veil application entry
src/
  app/                       client shell, providers, view routing
  components/
    common/                  buttons, cards, fields, sheets, dialogs, states
    navigation/              top bar and safe-area bottom tabs
    forms/                   reusable labeled form controls
  features/
    onboarding/              short local-first first-launch flow
    today/                   routine selection, progress, completion, notes
    routines/                routine list, builder, scheduling, history
    products/                library, product form/detail, PAO presentation
    progress/                journal, photos, comparisons, observations
    search/                  instant cross-entity search
    settings/                appearance, timing, privacy, storage, backups
  db/                        Dexie database, versions, migrations
  repositories/              entity-specific persistence operations
  services/                  schedules, sessions, images, backups, search
  hooks/                     database readiness, preferences, app data
  lib/                       constants and environment helpers
  styles/                    tokens, reset, layout, components, utilities
  types/                     domain and backup contracts
  utils/                     ids, dates, validation, formatting
public/
  icons/                     locally generated Veil icons
  manifest.webmanifest       install metadata
  sw.js                      offline application shell and runtime cache
tests/                       unit and integration suites
docs/                        architecture and implementation documentation
```

## Domain model

All persisted entities use UUID strings and ISO timestamps. Persistent order fields are numeric and separate from IDs.

- `products`: identity, brand, category, status, favorites, usage constraints, dates, PAO, ingredients, notes, and photo references.
- `routines`: name, period, favorite state, notes, and lifecycle timestamps.
- `routineSteps`: routine relationship, stable order, optional product link, category, directions, wait time, amount, notes, and required flag.
- `routineSchedules`: routine relationship plus `daily`, `weekdays`, `interval`, or `manual` configuration.
- `routineSessions`: immutable routine name snapshot, local day/period, start/completion times, status, progress totals, product IDs, and notes.
- `sessionSteps`: immutable step/product snapshots and a pending/completed/skipped state.
- `quickNotes`: timestamped daily notes optionally associated with a routine session.
- `journalEntries`: daily skin state, tags, notes, optional photo references, and product context.
- `progressPhotos`: local blob/thumbnail references, date, area, caption, and tags.
- `reactionLogs`: observation type, severity, notes, date, and product context without causation language.
- `categories`: default and user-created product categories.
- `incompatibilities`: user-defined product/step pairs with optional neutral notes.
- `media`: compressed local blobs, thumbnails, MIME type, dimensions, byte size, and purpose.
- `preferences`: typed application settings when values require IndexedDB transactions; only theme and first-launch flags may use localStorage.

## IndexedDB design and migrations

`VeilDatabase` will declare explicit Dexie versions. Schema version 1 creates the complete initial table/index set. Future changes will add a new `version(n).stores(...)` declaration and, when required, an `upgrade()` transform that is idempotent over the preceding version.

Indexes will serve the common paths: active products by status and favorites, routine steps by `[routineId+order]`, schedules by routine, sessions by local day and routine, entries/photos/logs by date, and media by purpose. Database initialization seeds only built-in categories and never skincare products or routines. A development seed utility is manually invoked and excluded from normal startup.

Repository methods will validate required relationships, update timestamps, use Dexie transactions for multi-table writes, and return domain-shaped results. Missing optional references are tolerated so deleted products do not corrupt routine or history display.

## Scheduling and Today selection

Scheduling is a pure, testable service:

- Daily schedules match every local date.
- Weekday schedules match configured local weekday numbers.
- Interval schedules compare calendar-day distance from an anchor date and match every positive `N` days.
- Manual schedules never auto-activate but remain available through manual switching.
- Routines are separated by AM, PM, or anytime; automatic period selection uses configurable morning and evening boundaries.
- The user can always override the period and choose a different scheduled or manual routine.
- If multiple routines match, explicit schedule priority and stable creation order resolve the primary routine while alternates remain selectable.

The incompatibility service only checks user-created pairs among products and steps in the chosen routine. Warnings explicitly state that the rules are personal organizational reminders, not medical guidance.

## Routine completion and history

Opening Today resolves or creates a draft session for the routine, local day, and AM/PM period. Step changes persist immediately. Completed and skipped steps remain visible with clear reversible states. When all steps are resolved, the session becomes complete and stores immutable name/product/step snapshots. Undoing a resolved step reopens the session. A calendar-style history view groups sessions by local day and opens a detailed snapshot even if original products or routines were later edited.

## Product and image handling

Product editing uses focused sections with inline validation and mobile-friendly controls. Destructive actions require an explicit confirmation dialog. PAO state is calculated from `dateOpened + paoMonths` and is always labeled separately from the printed expiration date.

Image processing will:

1. Decode the selected image with `createImageBitmap` where supported and an `HTMLImageElement` fallback.
2. Respect EXIF orientation as handled by the browser decoder.
3. Scale the full image to a practical maximum dimension and create a small thumbnail.
4. encode WebP when supported, otherwise JPEG, with restrained quality.
5. Persist only processed blobs and metadata in the `media` table.
6. revoke object URLs and release canvas/image resources promptly.
7. detect quota and decoding failures and display a human-readable recovery message.

## Backup and restore architecture

Export creates `veil-backup-YYYY-MM-DD.zip` containing:

```text
metadata.json
data.json
images/products/<media-id>.<ext>
images/journal/<media-id>.<ext>
images/progress/<media-id>.<ext>
```

Metadata includes application name/version, backup format version, database schema version, and creation time. `data.json` contains JSON-safe entity arrays and media descriptors; blobs are separate files.

Import first parses into memory, validates ZIP paths, metadata, supported versions, core arrays, UUID-like IDs, references, and declared media files, then presents a summary. Replace mode clears Veil tables only inside the final restore transaction. Merge mode keeps existing records and remaps colliding imported IDs consistently. Failed validation never mutates current data; failed writes roll back as a transaction where the browser allows it. Export and import tests will cover malformed, incompatible, missing-image, replace, and merge cases.

## PWA and offline behavior

- The manifest uses standalone display, portrait preference, theme/background colors, shortcuts, and local any/maskable icons.
- The document includes `viewport-fit=cover`, Apple PWA metadata, an Apple touch icon, and color-scheme-aware theme colors.
- The service worker precaches the root, manifest, and icons, then runtime-caches same-origin successful GET responses for scripts, styles, fonts, and images.
- Navigation requests use a network-first strategy with a cached root fallback; static assets use stale-while-revalidate.
- App updates activate safely, remove old cache versions, and announce availability without interrupting an active routine.
- All product, routine, journal, photo, search, settings, and history operations remain local and functional offline.

## Visual system and iPhone behavior

The visual direction combines warm porcelain backgrounds, ink-like text, a restrained sage accent, and soft rose/clay status tones. Large editorial headings use the system font stack so the app loads instantly and feels native. Cards use generous spacing, thin borders, large radii, and restrained depth rather than decorative gradients.

CSS variables cover semantic color, type scale, spacing, radii, shadows, borders, motion, and safe areas. System/light/dark modes share semantic tokens; theme preference is written to localStorage and reflected on the root before hydration where possible.

The shell uses all four safe-area inset environment variables. The bottom navigation includes the Home indicator inset, content has matching scroll padding, sticky headers account for the Dynamic Island/notch area, fields use at least 16px text to avoid iOS zoom, and primary targets are at least 44px. Layouts support portrait first, narrow 320px screens, landscape, desktop centering, standalone mode, keyboard-visible states, and reduced motion. Hover is never required.

## Accessibility and error handling

- Semantic headings, lists, navigation, dialogs, progress, and form labels.
- Visible `:focus-visible` treatment with sufficient light/dark contrast.
- Accessible alternatives for step reordering: move up/down buttons are always available; touch drag reordering is an enhancement only.
- Screen-reader status regions for saves, validation, imports, and session progress.
- Focus trapping/restoration in sheets and confirmation dialogs.
- Reduced-motion behavior and no decorative celebrations.
- A database initialization error state with retry guidance.
- Friendly messages for quota, invalid forms, missing references, unsupported APIs, corrupt backups, and failed migrations.
- A top-level recoverable error boundary; raw stack traces never appear in product UI.

## Performance strategy

- One client application entry with lazy-loaded secondary feature screens.
- Indexed queries and live queries scoped to the active view.
- Compressed images and thumbnails; full media decoded only in detail/comparison views.
- Object URL cleanup, bounded search results, memoized derived lists where measurement supports it, and no charting dependency for simple summaries.
- Avoid remote fonts and core external assets so startup and offline use are predictable.
- Production bundle review for oversized chunks and duplicated dependencies.

## Testing strategy

Pure unit tests will cover date keys, AM/PM selection, daily/weekday/interval schedule matching, PAO calculations, progress totals, and user-defined incompatibility warnings. Repository tests with fake-indexeddb will cover product create/edit/status changes, routine/session persistence, category seeding, and transactional cleanup. Backup tests will cover archive creation, validation, replace restore, and safe merge behavior. Component/integration tests will cover theme preferences, onboarding, Today step completion, forms, destructive confirmations, and key empty states.

A production smoke test will render the built HTML and assert Veil metadata, manifest linkage, and install/offline assets. Browser testing will exercise the central daily flow where the local environment supports it.

## Git development strategy

Git will remain on `main` with the sole `origin` set to `https://github.com/AntoniRom17/Veil.git`. Work will be committed in small, meaningful conventional commits after coherent implementation and verification units: setup, tokens, shell, database, each major feature, PWA, tests, accessibility, responsive fixes, performance, documentation, and final polish. The history will exceed 40 non-empty commits. Nothing will be pushed until the finished application passes the final verification checklist.

## Implementation phases

1. Establish project metadata, portable scripts, strict tooling, test environment, Git remote, and base documentation.
2. Build design tokens, reset styles, common components, app shell, safe-area navigation, theme handling, and onboarding.
3. Define the domain model, Dexie schema/migrations, repositories, seed categories, and database hooks.
4. Implement schedule/period logic, Today resolution, persisted sessions, step actions, quick notes, and history.
5. Implement product library, details, editing, statuses, favorites, PAO, local image compression, and media storage.
6. Implement the routine list/builder, scheduling, reordering, duplication, deletion, favorites, and incompatibility warnings.
7. Implement journal entries, progress photos, comparison, observations, and lightweight progress summaries.
8. Implement global search and the complete More area: settings, privacy, installation, storage reporting, export/import, and clear-data protection.
9. Add manifest, local icons, service worker, update handling, offline fallbacks, and iOS PWA metadata.
10. Add and expand unit/integration/smoke coverage; run type checking, lint, tests, and production builds.
11. Complete dedicated narrow-iPhone, dark-theme, keyboard, focus, safe-area, empty/loading/error, performance, and copy polish passes.
12. Finish README and architecture documentation, audit the repository and commit history, verify `main` and `origin`, push once, and verify success.

## Final verification

The release gate requires a clean working tree; strict type check; warning-free lint where reasonable; all unit/integration/smoke tests passing; successful production build; valid manifest, service worker, icon, and Apple metadata; offline relaunch after a first load; persistence after refresh; successful backup export and both guarded import modes; tested light, dark, and system themes; usable 320px, 375px, 390px, 430px, and landscape layouts; correct safe-area and Home indicator spacing; accessible keyboard and screen-reader paths; no TODOs, dead controls, placeholder content, or automatic sample records; more than 40 meaningful commits; correct `main` branch and sole GitHub origin; and a verified final push.

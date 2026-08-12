export const TABLE_NAMES = [
  "products",
  "routines",
  "routineSteps",
  "routineSchedules",
  "routineSessions",
  "sessionSteps",
  "quickNotes",
  "journalEntries",
  "progressPhotos",
  "reactionLogs",
  "categories",
  "incompatibilities",
  "media",
  "preferences",
] as const;

export type VeilTableName = (typeof TABLE_NAMES)[number];

/**
 * Add future migrations by appending a new `version(n)` declaration to
 * `VeilDatabase`. Keep previous store declarations intact so Dexie can migrate
 * users who skipped releases. Data transforms belong in that version's
 * `upgrade()` callback and must tolerate partially populated optional fields.
 */
export const CURRENT_SCHEMA_VERSION = 1;

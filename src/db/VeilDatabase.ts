import Dexie, { type EntityTable } from "dexie";
import {
  DATABASE_NAME,
  DEFAULT_CATEGORY_NAMES,
  createDefaultPreferences,
} from "@/src/lib/constants";
import type {
  Category,
  Incompatibility,
  JournalEntry,
  MediaAsset,
  Product,
  ProgressPhoto,
  QuickNote,
  ReactionLog,
  Routine,
  RoutineSchedule,
  RoutineSession,
  RoutineStep,
  SessionStep,
  VeilPreferences,
} from "@/src/types/domain";
import { createId } from "@/src/utils/id";

export class VeilDatabase extends Dexie {
  products!: EntityTable<Product, "id">;
  routines!: EntityTable<Routine, "id">;
  routineSteps!: EntityTable<RoutineStep, "id">;
  routineSchedules!: EntityTable<RoutineSchedule, "id">;
  routineSessions!: EntityTable<RoutineSession, "id">;
  sessionSteps!: EntityTable<SessionStep, "id">;
  quickNotes!: EntityTable<QuickNote, "id">;
  journalEntries!: EntityTable<JournalEntry, "id">;
  progressPhotos!: EntityTable<ProgressPhoto, "id">;
  reactionLogs!: EntityTable<ReactionLog, "id">;
  categories!: EntityTable<Category, "id">;
  incompatibilities!: EntityTable<Incompatibility, "id">;
  media!: EntityTable<MediaAsset, "id">;
  preferences!: EntityTable<VeilPreferences, "id">;

  constructor(name = DATABASE_NAME) {
    super(name);

    this.version(1).stores({
      products:
        "id, name, brand, categoryId, categoryName, status, favorite, dateOpened, updatedAt",
      routines: "id, name, period, favorite, archived, priority, updatedAt",
      routineSteps: "id, routineId, [routineId+order], productId, categoryName",
      routineSchedules: "id, routineId, kind, enabled",
      routineSessions:
        "id, routineId, localDate, [localDate+period], status, startedAt, completedAt",
      sessionSteps: "id, sessionId, [sessionId+order], productId, state",
      quickNotes: "id, localDate, capturedAt, sessionId",
      journalEntries: "id, localDate, capturedAt, *tags, *productIds",
      progressPhotos: "id, localDate, capturedAt, mediaId, *tags",
      reactionLogs: "id, localDate, capturedAt, *productIds, observationType",
      categories: "id, &name, builtIn, order",
      incompatibilities: "id, leftId, rightId, [leftId+rightId]",
      media: "id, purpose, createdAt",
      preferences: "id",
    });

    this.on("populate", () => this.seedInitialData());
  }

  private async seedInitialData(): Promise<void> {
    const now = new Date();
    const timestamp = now.toISOString();
    const categories: Category[] = DEFAULT_CATEGORY_NAMES.map((name, order) => ({
      id: createId(),
      name,
      builtIn: true,
      order,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await Promise.all([
      this.categories.bulkAdd(categories),
      this.preferences.add(createDefaultPreferences(now)),
    ]);
  }
}

let database: VeilDatabase | undefined;

export function getDatabase(): VeilDatabase {
  database ??= new VeilDatabase();
  return database;
}

export async function openDatabase(): Promise<VeilDatabase> {
  const db = getDatabase();
  if (!db.isOpen()) await db.open();
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (!database) return;
  database.close();
  database = undefined;
}

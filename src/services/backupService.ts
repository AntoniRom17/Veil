import JSZip from "jszip";
import type { VeilDatabase } from "@/src/db/VeilDatabase";
import {
  APP_NAME,
  APP_VERSION,
  BACKUP_FORMAT_VERSION,
  DATABASE_SCHEMA_VERSION,
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
import { toLocalDateKey } from "@/src/utils/dates";
import { VeilError } from "@/src/utils/errors";

export interface BackupMetadata {
  applicationName: typeof APP_NAME;
  applicationVersion: string;
  schemaVersion: number;
  formatVersion: number;
  createdAt: string;
}

interface BackupMediaDescriptor extends Omit<MediaAsset, "blob" | "thumbnail"> {
  filename: string;
  thumbnailFilename: string;
}

interface BackupData {
  products: Product[];
  routines: Routine[];
  routineSteps: RoutineStep[];
  routineSchedules: RoutineSchedule[];
  routineSessions: RoutineSession[];
  sessionSteps: SessionStep[];
  quickNotes: QuickNote[];
  journalEntries: JournalEntry[];
  progressPhotos: ProgressPhoto[];
  reactionLogs: ReactionLog[];
  categories: Category[];
  incompatibilities: Incompatibility[];
  preferences: VeilPreferences[];
  media: BackupMediaDescriptor[];
}

export interface ValidatedBackup {
  metadata: BackupMetadata;
  data: BackupData;
  media: MediaAsset[];
  counts: {
    products: number;
    routines: number;
    sessions: number;
    photos: number;
    records: number;
  };
}

export type RestoreMode = "replace" | "merge";

export interface RestoreResult {
  importedRecords: number;
  skippedCollisions: number;
}

const dataTableNames: Array<Exclude<keyof BackupData, "media">> = [
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
  "preferences",
];

export async function createBackup(db: VeilDatabase): Promise<Blob> {
  const [products, routines, routineSteps, routineSchedules, routineSessions, sessionSteps, quickNotes, journalEntries, progressPhotos, reactionLogs, categories, incompatibilities, preferences, media] = await Promise.all([
    db.products.toArray(), db.routines.toArray(), db.routineSteps.toArray(), db.routineSchedules.toArray(), db.routineSessions.toArray(), db.sessionSteps.toArray(), db.quickNotes.toArray(), db.journalEntries.toArray(), db.progressPhotos.toArray(), db.reactionLogs.toArray(), db.categories.toArray(), db.incompatibilities.toArray(), db.preferences.toArray(), db.media.toArray(),
  ]);
  const zip = new JSZip();
  const metadata: BackupMetadata = { applicationName: APP_NAME, applicationVersion: APP_VERSION, schemaVersion: DATABASE_SCHEMA_VERSION, formatVersion: BACKUP_FORMAT_VERSION, createdAt: new Date().toISOString() };
  const descriptors: BackupMediaDescriptor[] = [];
  for (const asset of media) {
    const extension = extensionFor(asset.mimeType);
    const folder = `images/${asset.purpose}`;
    const filename = `${folder}/${asset.id}.${extension}`;
    const thumbnailFilename = `${folder}/${asset.id}-thumbnail.${extension}`;
    zip.file(filename, asset.blob);
    zip.file(thumbnailFilename, asset.thumbnail);
    const { blob: _blob, thumbnail: _thumbnail, ...descriptor } = asset;
    void _blob;
    void _thumbnail;
    descriptors.push({ ...descriptor, filename, thumbnailFilename });
  }
  const data: BackupData = { products, routines, routineSteps, routineSchedules, routineSessions, sessionSteps, quickNotes, journalEntries, progressPhotos, reactionLogs, categories, incompatibilities, preferences, media: descriptors };
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));
  zip.file("data.json", JSON.stringify(data, null, 2));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export function downloadBackup(blob: Blob, date = new Date()): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `veil-backup-${toLocalDateKey(date)}.zip`;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function validateBackup(file: Blob): Promise<ValidatedBackup> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (error) {
    throw new VeilError("This file is not a readable Veil backup.", "BACKUP_ZIP_INVALID", { cause: error });
  }
  const paths = Object.keys(zip.files);
  if (paths.some((path) => path.startsWith("/") || path.split("/").includes(".."))) {
    throw new VeilError("This backup contains unsafe file paths.", "BACKUP_PATH_INVALID");
  }
  const metadataFile = zip.file("metadata.json");
  const dataFile = zip.file("data.json");
  if (!metadataFile || !dataFile) throw new VeilError("This backup is missing metadata.json or data.json.", "BACKUP_FILES_MISSING");
  const metadata = parseJson(await metadataFile.async("string"), "backup metadata") as Partial<BackupMetadata>;
  if (metadata.applicationName !== APP_NAME) throw new VeilError("This backup was not created by Veil.", "BACKUP_APP_MISMATCH");
  if (metadata.formatVersion !== BACKUP_FORMAT_VERSION) throw new VeilError("This backup format is not supported by this version of Veil.", "BACKUP_FORMAT_UNSUPPORTED");
  if (!metadata.schemaVersion || metadata.schemaVersion > DATABASE_SCHEMA_VERSION) throw new VeilError("This backup was created by a newer database version of Veil.", "BACKUP_SCHEMA_NEWER");
  if (!metadata.createdAt || Number.isNaN(Date.parse(metadata.createdAt))) throw new VeilError("This backup has an invalid creation date.", "BACKUP_DATE_INVALID");
  const data = parseJson(await dataFile.async("string"), "backup data") as Partial<BackupData>;
  for (const tableName of [...dataTableNames, "media"] as Array<keyof BackupData>) {
    if (!Array.isArray(data[tableName])) throw new VeilError(`This backup has invalid ${tableName} data.`, "BACKUP_STRUCTURE_INVALID");
  }
  const mediaAssets: MediaAsset[] = [];
  for (const descriptor of data.media!) {
    if (!descriptor || typeof descriptor !== "object" || !descriptor.id || !descriptor.filename || !descriptor.thumbnailFilename) throw new VeilError("This backup has an invalid media description.", "BACKUP_MEDIA_INVALID");
    const full = zip.file(descriptor.filename);
    const thumbnail = zip.file(descriptor.thumbnailFilename);
    if (!full || !thumbnail) throw new VeilError("This backup is missing one or more local photos.", "BACKUP_IMAGE_MISSING");
    const { filename: _filename, thumbnailFilename: _thumbnailFilename, ...asset } = descriptor;
    void _filename;
    void _thumbnailFilename;
    mediaAssets.push({ ...asset, blob: await full.async("blob"), thumbnail: await thumbnail.async("blob") });
  }
  const typedData = data as BackupData;
  const records = dataTableNames.reduce((sum, tableName) => sum + typedData[tableName].length, mediaAssets.length);
  return { metadata: metadata as BackupMetadata, data: typedData, media: mediaAssets, counts: { products: typedData.products.length, routines: typedData.routines.length, sessions: typedData.routineSessions.length, photos: mediaAssets.length, records } };
}

export async function restoreBackup(db: VeilDatabase, backup: ValidatedBackup, mode: RestoreMode): Promise<RestoreResult> {
  let importedRecords = 0;
  let skippedCollisions = 0;
  await db.transaction("rw", db.tables, async () => {
    if (mode === "replace") await Promise.all(db.tables.map((table) => table.clear()));
    for (const tableName of dataTableNames) {
      const table = db.table<unknown, string>(tableName);
      const records = backup.data[tableName] as unknown[];
      if (mode === "replace") {
        await table.bulkAdd(records);
        importedRecords += records.length;
      } else {
        const incoming = records.filter((record): record is Record<string, unknown> => Boolean(record && typeof record === "object"));
        const keys = incoming.map((record) => String(record.id));
        const existing = await table.bulkGet(keys);
        const safe = incoming.filter((_, index) => existing[index] === undefined);
        if (safe.length) await table.bulkAdd(safe);
        importedRecords += safe.length;
        skippedCollisions += incoming.length - safe.length;
      }
    }
    const mediaTable = db.table<MediaAsset, string>("media");
    if (mode === "replace") {
      await mediaTable.bulkAdd(backup.media);
      importedRecords += backup.media.length;
    } else {
      const existing = await mediaTable.bulkGet(backup.media.map((asset) => asset.id));
      const safe = backup.media.filter((_, index) => existing[index] === undefined);
      if (safe.length) await mediaTable.bulkAdd(safe);
      importedRecords += safe.length;
      skippedCollisions += backup.media.length - safe.length;
    }
  });
  return { importedRecords, skippedCollisions };
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    throw new VeilError(`The ${label} contains invalid JSON.`, "BACKUP_JSON_INVALID", { cause: error });
  }
}

function extensionFor(mimeType: string): string {
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

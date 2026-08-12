import type { VeilDatabase } from "@/src/db/VeilDatabase";
import type { StorageSummary } from "@/src/types/domain";

export async function getStorageSummary(db: VeilDatabase): Promise<StorageSummary> {
  const [productCount, routineCount, sessionCount, journalEntryCount, progressPhotoCount, media, tableCounts, estimate] = await Promise.all([
    db.products.count(),
    db.routines.count(),
    db.routineSessions.count(),
    db.journalEntries.count(),
    db.progressPhotos.count(),
    db.media.toArray(),
    Promise.all(db.tables.map((table) => table.count())),
    navigator.storage?.estimate?.().catch(() => undefined),
  ]);
  return {
    productCount,
    routineCount,
    sessionCount,
    journalEntryCount,
    progressPhotoCount,
    mediaCount: media.length,
    recordCount: tableCounts.reduce((sum, count) => sum + count, 0),
    mediaBytes: media.reduce((sum, asset) => sum + asset.byteSize, 0),
    usageBytes: estimate?.usage,
    quotaBytes: estimate?.quota,
  };
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined) return "Not available";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

import type { VeilDatabase } from "@/src/db/VeilDatabase";
import type {
  JournalEntry,
  ObservationType,
  ProgressPhoto,
  ReactionLog,
  SkinFeel,
} from "@/src/types/domain";
import { toLocalDateKey } from "@/src/utils/dates";
import { VeilError } from "@/src/utils/errors";
import { createId } from "@/src/utils/id";

export interface JournalDraft {
  localDate?: string;
  title: string;
  notes: string;
  skinFeel: SkinFeel;
  tags: string[];
  photoIds: string[];
  productIds: string[];
}

export interface ProgressPhotoDraft {
  localDate?: string;
  mediaId: string;
  area: string;
  caption: string;
  tags: string[];
}

export interface ReactionDraft {
  localDate?: string;
  productIds: string[];
  observationType: ObservationType;
  severity: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export class ProgressRepository {
  constructor(private readonly db: VeilDatabase) {}

  async listJournal(): Promise<JournalEntry[]> {
    return (await this.db.journalEntries.toArray()).sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
  }

  async createJournal(draft: JournalDraft, date = new Date()): Promise<JournalEntry> {
    if (!draft.notes.trim() && !draft.title.trim()) {
      throw new VeilError("Add a title or a note before saving.", "JOURNAL_CONTENT_REQUIRED");
    }
    const timestamp = date.toISOString();
    const entry: JournalEntry = {
      ...draft,
      title: draft.title.trim() || "Daily check-in",
      notes: draft.notes.trim(),
      id: createId(),
      localDate: draft.localDate || toLocalDateKey(date),
      capturedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.journalEntries.add(entry);
    return entry;
  }

  async removeJournal(id: string): Promise<void> {
    const entry = await this.db.journalEntries.get(id);
    if (!entry) return;
    await this.db.transaction("rw", [this.db.journalEntries, this.db.media], async () => {
      await this.db.journalEntries.delete(id);
      await this.db.media.bulkDelete(entry.photoIds);
    });
  }

  async listPhotos(): Promise<ProgressPhoto[]> {
    return (await this.db.progressPhotos.toArray()).sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
  }

  async createPhoto(draft: ProgressPhotoDraft, date = new Date()): Promise<ProgressPhoto> {
    if (!draft.mediaId) throw new VeilError("Choose a progress photo first.", "PROGRESS_PHOTO_REQUIRED");
    const timestamp = date.toISOString();
    const photo: ProgressPhoto = {
      ...draft,
      area: draft.area.trim() || "Face",
      caption: draft.caption.trim(),
      id: createId(),
      localDate: draft.localDate || toLocalDateKey(date),
      capturedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.progressPhotos.add(photo);
    return photo;
  }

  async removePhoto(id: string): Promise<void> {
    const photo = await this.db.progressPhotos.get(id);
    if (!photo) return;
    await this.db.transaction("rw", [this.db.progressPhotos, this.db.media], async () => {
      await this.db.progressPhotos.delete(id);
      await this.db.media.delete(photo.mediaId);
    });
  }

  async listReactions(): Promise<ReactionLog[]> {
    return (await this.db.reactionLogs.toArray()).sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
  }

  async createReaction(draft: ReactionDraft, date = new Date()): Promise<ReactionLog> {
    if (!draft.notes.trim()) throw new VeilError("Describe what you observed before saving.", "OBSERVATION_NOTES_REQUIRED");
    const timestamp = date.toISOString();
    const log: ReactionLog = {
      ...draft,
      notes: draft.notes.trim(),
      id: createId(),
      localDate: draft.localDate || toLocalDateKey(date),
      capturedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.reactionLogs.add(log);
    return log;
  }

  removeReaction(id: string): Promise<void> {
    return this.db.reactionLogs.delete(id);
  }
}

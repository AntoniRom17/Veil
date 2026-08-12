import type { VeilDatabase } from "@/src/db/VeilDatabase";
import type { QuickNote } from "@/src/types/domain";
import { toLocalDateKey } from "@/src/utils/dates";
import { VeilError } from "@/src/utils/errors";
import { createId } from "@/src/utils/id";

export class NotesRepository {
  constructor(private readonly db: VeilDatabase) {}

  async list(localDate?: string): Promise<QuickNote[]> {
    const notes = localDate
      ? await this.db.quickNotes.where("localDate").equals(localDate).toArray()
      : await this.db.quickNotes.toArray();
    return notes.sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
  }

  async create(text: string, sessionId?: string, date = new Date()): Promise<QuickNote> {
    const trimmed = text.trim();
    if (!trimmed) throw new VeilError("Write a note before saving.", "NOTE_TEXT_REQUIRED");
    const timestamp = date.toISOString();
    const note: QuickNote = {
      id: createId(),
      localDate: toLocalDateKey(date),
      capturedAt: timestamp,
      text: trimmed,
      sessionId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.quickNotes.add(note);
    return note;
  }

  remove(id: string): Promise<void> {
    return this.db.quickNotes.delete(id);
  }
}

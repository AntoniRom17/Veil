import type { VeilDatabase } from "@/src/db/VeilDatabase";
import { createDefaultPreferences } from "@/src/lib/constants";
import type { VeilPreferences } from "@/src/types/domain";

export class PreferencesRepository {
  constructor(private readonly db: VeilDatabase) {}

  async get(): Promise<VeilPreferences> {
    return (await this.db.preferences.get("preferences")) ?? createDefaultPreferences();
  }

  async update(changes: Partial<Omit<VeilPreferences, "id" | "createdAt">>): Promise<VeilPreferences> {
    const existing = await this.get();
    const updated: VeilPreferences = { ...existing, ...changes, id: "preferences", updatedAt: new Date().toISOString() };
    await this.db.preferences.put(updated);
    return updated;
  }
}

import { VeilDatabase } from "@/src/db/VeilDatabase";

export async function createTestDatabase(label: string): Promise<VeilDatabase> {
  const db = new VeilDatabase(`veil-test-${label}-${crypto.randomUUID()}`);
  await db.open();
  return db;
}

export async function destroyTestDatabase(db: VeilDatabase): Promise<void> {
  await db.delete();
}

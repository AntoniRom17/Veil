import { afterEach, describe, expect, it } from "vitest";
import type { VeilDatabase } from "@/src/db/VeilDatabase";
import { ProductRepository } from "@/src/repositories/productRepository";
import { createBackup, restoreBackup, validateBackup } from "@/src/services/backupService";
import { createTestDatabase, destroyTestDatabase } from "./helpers/database";

const openDatabases: VeilDatabase[] = [];

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((db) => destroyTestDatabase(db)));
});

async function databaseWithProduct(label: string) {
  const db = await createTestDatabase(label);
  openDatabases.push(db);
  const category = await db.categories.orderBy("order").first();
  if (!category) throw new Error("Expected a category");
  const product = await new ProductRepository(db).create({ name: "Gentle Cleanser", brand: "Local", categoryId: category.id, categoryName: category.name, notes: "", ingredients: "water", activeIngredients: "", intendedFrequency: "Daily", amAllowed: true, pmAllowed: true, status: "active", favorite: true });
  return { db, product };
}

describe("Veil backups", () => {
  it("generates and validates a complete backup", async () => {
    const { db, product } = await databaseWithProduct("backup-source");
    const validated = await validateBackup(await createBackup(db));
    expect(validated.metadata).toMatchObject({ applicationName: "Veil", formatVersion: 1, schemaVersion: 1 });
    expect(validated.data.products).toEqual([product]);
    expect(validated.counts.products).toBe(1);
  });

  it("rejects malformed backup archives without mutating data", async () => {
    const { db } = await databaseWithProduct("backup-invalid");
    await expect(validateBackup(new Blob(["not a zip"]))).rejects.toMatchObject({ code: "BACKUP_ZIP_INVALID" });
    expect(await db.products.count()).toBe(1);
  });

  it("replaces existing records only after validation", async () => {
    const source = await databaseWithProduct("backup-replace-source");
    const backup = await validateBackup(await createBackup(source.db));
    const target = await createTestDatabase("backup-replace-target");
    openDatabases.push(target);
    const targetCategory = await target.categories.orderBy("order").first();
    if (!targetCategory) throw new Error("Expected a category");
    await new ProductRepository(target).create({ name: "To Replace", brand: "", categoryId: targetCategory.id, categoryName: targetCategory.name, notes: "", ingredients: "", activeIngredients: "", intendedFrequency: "", amAllowed: true, pmAllowed: true, status: "active", favorite: false });
    const result = await restoreBackup(target, backup, "replace");
    expect(result.importedRecords).toBeGreaterThan(0);
    expect((await target.products.toArray()).map((product) => product.name)).toEqual(["Gentle Cleanser"]);
  });

  it("merges safely and skips colliding IDs", async () => {
    const source = await databaseWithProduct("backup-merge-source");
    const backup = await validateBackup(await createBackup(source.db));
    const result = await restoreBackup(source.db, backup, "merge");
    expect(result.skippedCollisions).toBeGreaterThan(0);
    expect(await source.db.products.count()).toBe(1);
  });
});

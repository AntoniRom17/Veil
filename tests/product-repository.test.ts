import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VeilDatabase } from "@/src/db/VeilDatabase";
import { ProductRepository, type ProductDraft } from "@/src/repositories/productRepository";
import { createTestDatabase, destroyTestDatabase } from "./helpers/database";

describe("ProductRepository", () => {
  let db: VeilDatabase;
  let repository: ProductRepository;
  let draft: ProductDraft;

  beforeEach(async () => {
    db = await createTestDatabase("products");
    repository = new ProductRepository(db);
    const category = await db.categories.orderBy("order").first();
    if (!category) throw new Error("Expected built-in categories");
    draft = { name: "  Barrier Cream  ", brand: "Veil Lab", categoryId: category.id, categoryName: category.name, notes: "", ingredients: "ceramides", activeIngredients: "", intendedFrequency: "Daily", amAllowed: true, pmAllowed: true, status: "active", favorite: false };
  });

  afterEach(async () => destroyTestDatabase(db));

  it("seeds only built-in categories and preferences", async () => {
    expect(await db.categories.count()).toBeGreaterThan(10);
    expect(await db.products.count()).toBe(0);
    expect(await db.routines.count()).toBe(0);
    expect(await db.preferences.get("preferences")).toMatchObject({ morningStart: "05:00", eveningStart: "17:00" });
  });

  it("creates and normalizes a product", async () => {
    const product = await repository.create(draft);
    expect(product.name).toBe("Barrier Cream");
    expect(await repository.get(product.id)).toEqual(product);
  });

  it("edits products and changes status", async () => {
    const product = await repository.create(draft);
    const edited = await repository.update(product.id, { brand: "Updated", notes: "Comfortable" });
    expect(edited.brand).toBe("Updated");
    expect(edited.notes).toBe("Comfortable");
    expect((await repository.setStatus(product.id, "finished")).status).toBe("finished");
  });

  it("toggles favorites and creates a distinct duplicate", async () => {
    const product = await repository.create(draft);
    expect((await repository.toggleFavorite(product.id)).favorite).toBe(true);
    const copy = await repository.duplicate(product.id);
    expect(copy.id).not.toBe(product.id);
    expect(copy.name).toBe("Barrier Cream copy");
  });

  it("rejects incomplete product data", async () => {
    await expect(repository.create({ ...draft, name: "" })).rejects.toMatchObject({ code: "PRODUCT_NAME_REQUIRED" });
  });
});

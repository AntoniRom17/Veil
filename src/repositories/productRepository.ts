import type { VeilDatabase } from "@/src/db/VeilDatabase";
import type { Product, ProductStatus } from "@/src/types/domain";
import { createId } from "@/src/utils/id";
import { VeilError } from "@/src/utils/errors";

export type ProductDraft = Omit<Product, "id" | "createdAt" | "updatedAt">;

export class ProductRepository {
  constructor(private readonly db: VeilDatabase) {}

  async list(): Promise<Product[]> {
    const products = await this.db.products.toArray();
    return products.sort((left, right) => {
      if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
      if (left.status !== right.status) return left.status === "active" ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
  }

  get(id: string): Promise<Product | undefined> {
    return this.db.products.get(id);
  }

  async create(draft: ProductDraft): Promise<Product> {
    this.assertDraft(draft);
    const timestamp = new Date().toISOString();
    const product: Product = {
      ...draft,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.products.add(product);
    return product;
  }

  async update(id: string, changes: Partial<ProductDraft>): Promise<Product> {
    const existing = await this.require(id);
    const updated: Product = {
      ...existing,
      ...changes,
      id,
      name: (changes.name ?? existing.name).trim(),
      brand: (changes.brand ?? existing.brand).trim(),
      updatedAt: new Date().toISOString(),
    };
    this.assertDraft(updated);
    await this.db.products.put(updated);
    return updated;
  }

  setStatus(id: string, status: ProductStatus): Promise<Product> {
    return this.update(id, { status });
  }

  async toggleFavorite(id: string): Promise<Product> {
    const product = await this.require(id);
    return this.update(id, { favorite: !product.favorite });
  }

  async duplicate(id: string): Promise<Product> {
    const source = await this.require(id);
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = source;
    void _id;
    void _createdAt;
    void _updatedAt;
    return this.create({ ...draft, name: `${source.name} copy`, favorite: false });
  }

  async remove(id: string): Promise<void> {
    const product = await this.require(id);
    await this.db.transaction("rw", this.db.products, this.db.media, async () => {
      await this.db.products.delete(id);
      if (product.photoId) {
        const remainingReferences = await this.db.products.where("photoId").equals(product.photoId).count();
        if (!remainingReferences) await this.db.media.delete(product.photoId);
      }
    });
  }

  private async require(id: string): Promise<Product> {
    const product = await this.get(id);
    if (!product) throw new VeilError("That product no longer exists.", "PRODUCT_NOT_FOUND");
    return product;
  }

  private assertDraft(draft: Pick<ProductDraft, "name" | "categoryId" | "categoryName">): void {
    if (!draft.name.trim()) {
      throw new VeilError("Enter a product name before saving.", "PRODUCT_NAME_REQUIRED");
    }
    if (!draft.categoryId || !draft.categoryName) {
      throw new VeilError("Choose a category before saving.", "PRODUCT_CATEGORY_REQUIRED");
    }
  }
}

import type { VeilDatabase } from "@/src/db/VeilDatabase";
import type { Incompatibility } from "@/src/types/domain";
import { VeilError } from "@/src/utils/errors";
import { createId, pairKey } from "@/src/utils/id";

export class IncompatibilityRepository {
  constructor(private readonly db: VeilDatabase) {}

  list(): Promise<Incompatibility[]> {
    return this.db.incompatibilities.toArray();
  }

  async create(leftId: string, rightId: string, note: string): Promise<Incompatibility> {
    if (!leftId || !rightId || leftId === rightId) throw new VeilError("Choose two different products.", "INCOMPATIBILITY_PAIR_INVALID");
    const existing = await this.db.incompatibilities.toArray();
    const key = pairKey(leftId, rightId);
    if (existing.some((rule) => pairKey(rule.leftId, rule.rightId) === key)) throw new VeilError("That reminder already exists.", "INCOMPATIBILITY_EXISTS");
    const timestamp = new Date().toISOString();
    const rule: Incompatibility = { id: createId(), leftKind: "product", leftId, rightKind: "product", rightId, note: note.trim(), createdAt: timestamp, updatedAt: timestamp };
    await this.db.incompatibilities.add(rule);
    return rule;
  }

  remove(id: string): Promise<void> {
    return this.db.incompatibilities.delete(id);
  }
}

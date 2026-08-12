import { describe, expect, it } from "vitest";
import { findIncompatibilityWarnings } from "@/src/services/incompatibilityService";
import type { Incompatibility, RoutineStep } from "@/src/types/domain";
import { getPaoDate, getPaoState, toLocalDateKey } from "@/src/utils/dates";

describe("local date and PAO calculations", () => {
  it("creates a local date key without UTC rollover", () => {
    expect(toLocalDateKey(new Date(2026, 0, 2, 23, 59))).toBe("2026-01-02");
  });

  it("calculates PAO independently of printed expiration", () => {
    expect(getPaoDate("2026-01-10", 12)).toBe("2027-01-10");
  });

  it("labels fresh, expiring-soon, and past PAO states", () => {
    expect(getPaoState("2026-01-01", 12, new Date(2026, 5, 1))).toBe("fresh");
    expect(getPaoState("2025-09-01", 12, new Date(2026, 7, 15), 30)).toBe("expiring-soon");
    expect(getPaoState("2025-01-01", 12, new Date(2026, 0, 2))).toBe("past-pao");
  });
});

describe("user-defined incompatibility warnings", () => {
  it("only warns for rules whose targets are in the selected routine", () => {
    const timestamp = "2026-01-01T00:00:00.000Z";
    const steps: RoutineStep[] = [
      { id: "step-a", routineId: "routine", order: 0, name: "First", productId: "product-a", categoryName: "Serum", instructions: "", amountGuidance: "", notes: "", required: true, createdAt: timestamp, updatedAt: timestamp },
      { id: "step-b", routineId: "routine", order: 1, name: "Second", productId: "product-b", categoryName: "Treatment", instructions: "", amountGuidance: "", notes: "", required: true, createdAt: timestamp, updatedAt: timestamp },
    ];
    const rules: Incompatibility[] = [
      { id: "rule", leftKind: "product", leftId: "product-a", rightKind: "product", rightId: "product-b", note: "My reminder", createdAt: timestamp, updatedAt: timestamp },
      { id: "unrelated", leftKind: "product", leftId: "product-a", rightKind: "product", rightId: "product-c", note: "", createdAt: timestamp, updatedAt: timestamp },
    ];
    const warnings = findIncompatibilityWarnings(steps, rules, new Map([["product-a", "A"], ["product-b", "B"]]));
    expect(warnings).toEqual([{ ruleId: "rule", leftName: "A", rightName: "B", note: "My reminder" }]);
  });
});

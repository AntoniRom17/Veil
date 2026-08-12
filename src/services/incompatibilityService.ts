import type { Incompatibility, RoutineStep } from "@/src/types/domain";
import { pairKey } from "@/src/utils/id";

export interface IncompatibilityWarning {
  ruleId: string;
  leftName: string;
  rightName: string;
  note: string;
}

export function findIncompatibilityWarnings(
  steps: RoutineStep[],
  rules: Incompatibility[],
  productNames: Map<string, string> = new Map(),
): IncompatibilityWarning[] {
  const present = new Map<string, string>();
  for (const step of steps) {
    present.set(step.id, step.name);
    if (step.productId) present.set(step.productId, productNames.get(step.productId) ?? step.name);
  }
  const seen = new Set<string>();
  return rules.flatMap((rule) => {
    const key = pairKey(rule.leftId, rule.rightId);
    if (seen.has(key) || !present.has(rule.leftId) || !present.has(rule.rightId)) return [];
    seen.add(key);
    return [{
      ruleId: rule.id,
      leftName: present.get(rule.leftId)!,
      rightName: present.get(rule.rightId)!,
      note: rule.note,
    }];
  });
}

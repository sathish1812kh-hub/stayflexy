// FILE: src/modules/automation/engines/RuleEngine.ts
import type { ConditionPredicate } from "../types";

export class RuleEngine {
  /**
   * Evaluates ALL predicates with AND logic.
   * Returns true if all predicates pass (or if there are no predicates).
   */
  static evaluate(
    conditions: ConditionPredicate[],
    context: Record<string, unknown>
  ): boolean {
    if (conditions.length === 0) return true;
    return conditions.every((c) => RuleEngine.evaluateOne(c, context));
  }

  private static evaluateOne(
    cond: ConditionPredicate,
    ctx: Record<string, unknown>
  ): boolean {
    const ctxValue = ctx[cond.field];
    switch (cond.operator) {
      case "eq":
        return ctxValue === cond.value;
      case "gt":
        return typeof ctxValue === "number" && ctxValue > (cond.value as number);
      case "lt":
        return typeof ctxValue === "number" && ctxValue < (cond.value as number);
      case "gte":
        return typeof ctxValue === "number" && ctxValue >= (cond.value as number);
      case "lte":
        return typeof ctxValue === "number" && ctxValue <= (cond.value as number);
      case "contains":
        return (
          typeof ctxValue === "string" &&
          ctxValue.includes(cond.value as string)
        );
      case "in":
        return (
          Array.isArray(cond.value) &&
          (cond.value as unknown[]).includes(ctxValue)
        );
      default:
        return false;
    }
  }

  /**
   * Validates that the conditions array has valid structure.
   */
  static validateConditions(
    conditions: unknown[]
  ): conditions is ConditionPredicate[] {
    return conditions.every(
      (c) =>
        typeof (c as ConditionPredicate).field === "string" &&
        typeof (c as ConditionPredicate).operator === "string"
    );
  }
}

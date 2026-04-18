/**
 * Forms Module — Visibility-rule evaluator
 * ========================================
 *
 * Evaluates a `VisibilityRule` against the current form values to decide
 * whether a field should be rendered.
 */
import type { VisibilityRule } from "./schema";

type Values = Record<string, unknown>;

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function asNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function isVisible(rule: VisibilityRule | undefined, values: Values): boolean {
  if (!rule) return true;
  const target = values[rule.field];

  switch (rule.operator) {
    case "is_empty":
      return isEmpty(target);
    case "is_filled":
      return !isEmpty(target);
    case "equals":
      // Loose equality so "1" == 1 works for select-as-string vs number.
      return String(target ?? "") === String(rule.value ?? "");
    case "not_equals":
      return String(target ?? "") !== String(rule.value ?? "");
    case "in":
      return Array.isArray(rule.value)
        ? rule.value.map(String).includes(String(target ?? ""))
        : false;
    case "not_in":
      return Array.isArray(rule.value)
        ? !rule.value.map(String).includes(String(target ?? ""))
        : true;
    case "gt": {
      const a = asNumber(target);
      const b = asNumber(rule.value);
      return a !== null && b !== null && a > b;
    }
    case "gte": {
      const a = asNumber(target);
      const b = asNumber(rule.value);
      return a !== null && b !== null && a >= b;
    }
    case "lt": {
      const a = asNumber(target);
      const b = asNumber(rule.value);
      return a !== null && b !== null && a < b;
    }
    case "lte": {
      const a = asNumber(target);
      const b = asNumber(rule.value);
      return a !== null && b !== null && a <= b;
    }
    default:
      return true;
  }
}

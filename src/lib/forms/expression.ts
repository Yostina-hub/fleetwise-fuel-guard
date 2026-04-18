/**
 * Forms Module — Computed-field expression engine
 * ================================================
 *
 * Tiny safe evaluator for the `computedFrom.expression` strings produced by
 * the Editor. Supports:
 *   - {{field_key}} placeholders (resolved against the current form values)
 *   - SUM(repeater_key.field_key) — sums a numeric field across repeater rows
 *   - COUNT(repeater_key) — counts non-empty rows
 *   - + - * / and parentheses
 *   - numeric literals (incl. decimals)
 *
 * Crucially: NEVER uses `eval` / `new Function`. We tokenise + shunting-yard
 * + evaluate the RPN ourselves so a malicious `expression` from the DB cannot
 * execute arbitrary code.
 */

type Values = Record<string, unknown>;

// ---------- Aggregate helpers (resolved before tokenising) ---------------

function resolveAggregates(expr: string, values: Values): string {
  // SUM(repeaterKey.fieldKey)
  expr = expr.replace(
    /SUM\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g,
    (_, repKey: string, fieldKey: string) => {
      const rows = Array.isArray(values[repKey]) ? (values[repKey] as any[]) : [];
      const total = rows.reduce((acc, row) => {
        const n = Number(row?.[fieldKey]);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0);
      return String(total);
    },
  );
  // COUNT(repeaterKey)
  expr = expr.replace(
    /COUNT\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g,
    (_, repKey: string) => {
      const rows = Array.isArray(values[repKey]) ? (values[repKey] as any[]) : [];
      const filled = rows.filter(
        (row) => row && Object.values(row).some((v) => v !== "" && v !== null && v !== undefined),
      );
      return String(filled.length);
    },
  );
  return expr;
}

// ---------- Placeholder resolution ---------------------------------------

function resolvePlaceholders(expr: string, values: Values): string {
  return expr.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g, (_, key: string) => {
    // dotted paths (a.b) → walk
    const parts = key.split(".");
    let cur: any = values;
    for (const p of parts) {
      cur = cur?.[p];
      if (cur === undefined) break;
    }
    const n = Number(cur);
    if (Number.isFinite(n)) return String(n);
    // Non-numeric — substitute 0 so math doesn't NaN out.
    return "0";
  });
}

// ---------- Shunting-yard tokenizer + evaluator --------------------------

type Token = { type: "num"; value: number } | { type: "op"; value: string } | { type: "lp" } | { type: "rp" };

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (c === "(") { tokens.push({ type: "lp" }); i++; continue; }
    if (c === ")") { tokens.push({ type: "rp" }); i++; continue; }
    if ("+-*/".includes(c)) {
      // Handle unary minus: at start or after another op/lp
      const prev = tokens[tokens.length - 1];
      if (c === "-" && (!prev || prev.type === "op" || prev.type === "lp")) {
        // parse a negative number
        let j = i + 1;
        while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
        const numStr = expr.slice(i, j);
        const n = Number(numStr);
        if (!Number.isFinite(n)) return null;
        tokens.push({ type: "num", value: n });
        i = j;
        continue;
      }
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const n = Number(expr.slice(i, j));
      if (!Number.isFinite(n)) return null;
      tokens.push({ type: "num", value: n });
      i = j;
      continue;
    }
    // Unknown character — bail.
    return null;
  }
  return tokens;
}

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

function toRPN(tokens: Token[]): Token[] | null {
  const out: Token[] = [];
  const stack: Token[] = [];
  for (const t of tokens) {
    if (t.type === "num") out.push(t);
    else if (t.type === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type === "op" && PRECEDENCE[top.value] >= PRECEDENCE[t.value]) {
          out.push(stack.pop()!);
        } else break;
      }
      stack.push(t);
    } else if (t.type === "lp") stack.push(t);
    else if (t.type === "rp") {
      while (stack.length && stack[stack.length - 1].type !== "lp") {
        out.push(stack.pop()!);
      }
      if (!stack.length) return null;
      stack.pop(); // remove lp
    }
  }
  while (stack.length) {
    const top = stack.pop()!;
    if (top.type === "lp" || top.type === "rp") return null;
    out.push(top);
  }
  return out;
}

function evalRPN(rpn: Token[]): number | null {
  const stack: number[] = [];
  for (const t of rpn) {
    if (t.type === "num") stack.push(t.value);
    else if (t.type === "op") {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return null;
      switch (t.value) {
        case "+": stack.push(a + b); break;
        case "-": stack.push(a - b); break;
        case "*": stack.push(a * b); break;
        case "/": stack.push(b === 0 ? 0 : a / b); break;
      }
    }
  }
  return stack.length === 1 ? stack[0] : null;
}

/** Evaluate an expression against the current values. Returns null on parse
 *  failure so callers can render an empty string instead of crashing. */
export function evalExpression(expression: string, values: Values): number | null {
  if (!expression || typeof expression !== "string") return null;
  const withAggs = resolveAggregates(expression, values);
  const resolved = resolvePlaceholders(withAggs, values);
  const tokens = tokenize(resolved);
  if (!tokens) return null;
  const rpn = toRPN(tokens);
  if (!rpn) return null;
  return evalRPN(rpn);
}

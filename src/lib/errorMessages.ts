/**
 * Friendly error message translator.
 *
 * Turns raw Postgres / Supabase / network / auth errors into clear,
 * user-facing messages.
 *
 *   import { friendlyError, friendlyToastError } from "@/lib/errorMessages";
 *
 *   try { ... }
 *   catch (e) {
 *     friendlyToastError(e, { action: "save driver" });
 *   }
 */
import { toast } from "sonner";

type AnyError = unknown;

interface ParsedError {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
  status?: number;
  raw?: unknown;
}

function parse(e: AnyError): ParsedError {
  if (!e) return { message: "Something went wrong" };
  if (typeof e === "string") return { message: e };
  if (e instanceof Error) {
    const anyE = e as Error & {
      code?: string;
      details?: string;
      hint?: string;
      status?: number;
    };
    return {
      code: anyE.code,
      message: e.message || "Something went wrong",
      details: anyE.details,
      hint: anyE.hint,
      status: anyE.status,
      raw: e,
    };
  }
  if (typeof e === "object" && e !== null) {
    const o = e as Record<string, unknown>;
    return {
      code: typeof o.code === "string" ? o.code : undefined,
      message:
        (typeof o.message === "string" && o.message) ||
        (typeof o.error_description === "string" && o.error_description) ||
        (typeof o.error === "string" && o.error) ||
        "Something went wrong",
      details: typeof o.details === "string" ? o.details : undefined,
      hint: typeof o.hint === "string" ? o.hint : undefined,
      status: typeof o.status === "number" ? o.status : undefined,
      raw: e,
    };
  }
  return { message: String(e) };
}

/** Try to extract the column / constraint name from a Postgres error message. */
function pickConstraint(msg: string): string | undefined {
  const m =
    msg.match(/constraint "([^"]+)"/i) ||
    msg.match(/column "([^"]+)"/i) ||
    msg.match(/relation "([^"]+)"/i) ||
    msg.match(/key \(([^)]+)\)/i);
  return m?.[1];
}

function humanizeColumn(col?: string): string {
  if (!col) return "this field";
  return col
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Map a parsed error to a friendly user-facing string.
 */
export function friendlyError(e: AnyError, fallback?: string): string {
  const p = parse(e);
  const msg = p.message || "";
  const lower = msg.toLowerCase();

  // ---- Postgres SQLSTATE codes ----
  switch (p.code) {
    case "23505": {
      // unique_violation
      const col = pickConstraint(msg + " " + (p.details ?? ""));
      const field = humanizeColumn(col);
      return `This ${field.toLowerCase()} is already in use. Please choose a different value.`;
    }
    case "23503": {
      // foreign_key_violation
      const col = pickConstraint(msg + " " + (p.details ?? ""));
      return col
        ? `Cannot complete the action because a related ${humanizeColumn(col).toLowerCase()} record is missing or still in use.`
        : "Cannot complete the action because a related record is missing or still in use.";
    }
    case "23502": {
      // not_null_violation
      const col = pickConstraint(msg);
      return `${humanizeColumn(col)} is required.`;
    }
    case "23514":
      return "Some of the values entered are not allowed. Please review the form and try again.";
    case "22001":
      return "One of the values is too long. Please shorten it and try again.";
    case "22003":
      return "A number value is out of the allowed range.";
    case "22007":
    case "22008":
      return "Invalid date or time. Please check the format.";
    case "22P02":
      return "One of the values has the wrong format. Please review the form.";
    case "42501":
      return "You don't have permission to perform this action.";
    case "42P01":
      return "The requested data is not available right now. Please refresh and try again.";
    case "40001":
    case "40P01":
      return "The system is busy. Please try again in a moment.";
    case "57014":
      return "The request took too long and was cancelled. Please try again.";
    case "P0001":
      // raise_exception from a trigger — usually has a human message already
      return msg || "The action was blocked by a business rule.";
    case "PGRST301":
    case "PGRST302":
      return "Your session has expired. Please sign in again.";
    case "PGRST116":
      return "No matching record was found.";
    case "PGRST204":
      return "One of the fields you submitted doesn't exist. Please refresh the page.";
  }

  // ---- HTTP status codes ----
  if (p.status === 401) return "Your session has expired. Please sign in again.";
  if (p.status === 403) return "You don't have permission to perform this action.";
  if (p.status === 404) return "The requested item could not be found.";
  if (p.status === 408) return "The request timed out. Please try again.";
  if (p.status === 409) return "This conflicts with existing data. Please refresh and try again.";
  if (p.status === 413) return "The file or data you uploaded is too large.";
  if (p.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (p.status && p.status >= 500 && p.status < 600)
    return "The server is having trouble right now. Please try again shortly.";

  // ---- Supabase Auth common messages ----
  if (lower.includes("invalid login credentials") || lower.includes("invalid email or password"))
    return "Incorrect email or password.";
  if (lower.includes("email not confirmed"))
    return "Please verify your email address before signing in.";
  if (lower.includes("user already registered") || lower.includes("already registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (lower.includes("password should be") || lower.includes("password is too weak"))
    return "Your password is too weak. Use at least 8 characters with a mix of letters and numbers.";
  if (lower.includes("rate limit") || lower.includes("too many requests"))
    return "Too many attempts. Please wait a minute and try again.";
  if (lower.includes("jwt expired") || lower.includes("jwt is expired") || lower.includes("token has expired"))
    return "Your session has expired. Please sign in again.";
  if (lower.includes("invalid jwt") || lower.includes("invalid token"))
    return "Your session is no longer valid. Please sign in again.";
  if (lower.includes("user not found"))
    return "No account found with these details.";
  if (lower.includes("otp") && lower.includes("expired"))
    return "The verification code has expired. Please request a new one.";
  if (lower.includes("otp") && (lower.includes("invalid") || lower.includes("incorrect")))
    return "The verification code is incorrect. Please try again.";

  // ---- Network / fetch ----
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed"))
    return "Can't reach the server. Check your internet connection and try again.";
  if (lower.includes("aborted") || lower.includes("timeout") || lower.includes("timed out"))
    return "The request took too long. Please try again.";
  if (lower.includes("cors"))
    return "A network security check blocked this request. Please refresh and try again.";

  // ---- Storage ----
  if (lower.includes("payload too large") || lower.includes("file size"))
    return "The file is too large to upload.";
  if (lower.includes("mime type") || lower.includes("file type"))
    return "This file type is not supported.";
  if (lower.includes("bucket") && lower.includes("not found"))
    return "Storage location is not available. Please contact support.";

  // ---- Permission / RLS ----
  if (lower.includes("row-level security") || lower.includes("rls") || lower.includes("permission denied"))
    return "You don't have permission to perform this action.";
  if (lower.includes("violates check constraint"))
    return "Some of the values entered are not allowed. Please review and try again.";

  // ---- Validation library hints ----
  if (lower.includes("zod") || lower.includes("invalid_type") || lower.includes("required"))
    return msg.length < 200 ? msg : "Please check the form for missing or invalid fields.";

  // ---- Edge function failures ----
  if (lower.includes("function returned an error") || lower.includes("non-2xx"))
    return "The server couldn't complete the request. Please try again.";
  if (lower.includes("functionsfetcherror"))
    return "Couldn't reach the service. Please try again in a moment.";

  // Final fallback: trust the message if it's already short and human-ish.
  if (msg && msg.length > 0 && msg.length < 200 && !msg.includes("\n")) return msg;
  return fallback || "Something went wrong. Please try again.";
}

/**
 * Show a sonner toast with a friendly error message.
 *
 *   friendlyToastError(err);
 *   friendlyToastError(err, { action: "save driver" });
 *   friendlyToastError(err, { title: "Couldn't save driver" });
 */
export function friendlyToastError(
  e: AnyError,
  opts?: { title?: string; action?: string; fallback?: string },
) {
  const description = friendlyError(e, opts?.fallback);
  const title =
    opts?.title ??
    (opts?.action ? `Couldn't ${opts.action}` : "Something went wrong");
  return toast.error(title, { description });
}

/** Object form for libraries (e.g. legacy use-toast) that take {title, description, variant}. */
export function friendlyToastObject(
  e: AnyError,
  opts?: { title?: string; action?: string; fallback?: string },
) {
  return {
    title:
      opts?.title ??
      (opts?.action ? `Couldn't ${opts.action}` : "Something went wrong"),
    description: friendlyError(e, opts?.fallback),
    variant: "destructive" as const,
  };
}

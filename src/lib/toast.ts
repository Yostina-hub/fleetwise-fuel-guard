import { toast } from "sonner";
import { friendlyError } from "@/lib/errorMessages";

/**
 * Centralized CRUD toast helpers.
 *
 * Use these to keep all create / read / update / delete feedback consistent
 * across the app. They wrap `sonner` so styling stays unified.
 *
 * Examples:
 *   crudToast.created("Driver");
 *   crudToast.updated("Vehicle", { description: plateNumber });
 *   crudToast.deleted("Trip");
 *   crudToast.error("save driver", err);
 *
 *   // Long-running operation:
 *   const id = crudToast.loading("Uploading documents…");
 *   try {
 *     await upload();
 *     crudToast.success("Documents uploaded", { id });
 *   } catch (e) {
 *     crudToast.error("upload documents", e, { id });
 *   }
 *
 *   // Promise-based:
 *   crudToast.promise(saveDriver(), {
 *     loading: "Saving driver…",
 *     success: "Driver saved",
 *     error: "Failed to save driver",
 *   });
 */

type ToastOpts = Parameters<typeof toast.success>[1];

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const errMessage = (e: unknown, fallback = "Something went wrong") => {
  if (!e) return fallback;
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message: unknown }).message) || fallback;
  }
  return fallback;
};

export const crudToast = {
  /** e.g. crudToast.created("Driver") -> "Driver created" */
  created: (entity: string, opts?: ToastOpts) =>
    toast.success(`${cap(entity)} created`, opts),

  updated: (entity: string, opts?: ToastOpts) =>
    toast.success(`${cap(entity)} updated`, opts),

  deleted: (entity: string, opts?: ToastOpts) =>
    toast.success(`${cap(entity)} deleted`, opts),

  saved: (entity: string, opts?: ToastOpts) =>
    toast.success(`${cap(entity)} saved`, opts),

  /** Generic success */
  success: (message: string, opts?: ToastOpts) => toast.success(message, opts),

  /** Generic info */
  info: (message: string, opts?: ToastOpts) => toast.info(message, opts),

  /** Generic warning */
  warning: (message: string, opts?: ToastOpts) => toast.warning(message, opts),

  /**
   * Error from a CRUD action.
   *   crudToast.error("save driver", err)
   * Produces title "Failed to save driver" and description with the error message.
   */
  error: (action: string, error?: unknown, opts?: ToastOpts) =>
    toast.error(`Couldn't ${action}`, {
      description: friendlyError(error),
      ...opts,
    }),

  /** Long-running loading state. Returns id; finish with .success/.error using { id }. */
  loading: (message: string, opts?: ToastOpts) => toast.loading(message, opts),

  /** Promise-based wrapper for async CRUD ops. */
  promise: <T>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error?: string | ((err: unknown) => string);
    },
  ) =>
    toast.promise(promise, {
      loading: msgs.loading,
      success: msgs.success as never,
      error: (err) =>
        typeof msgs.error === "function"
          ? msgs.error(err)
          : msgs.error ?? friendlyError(err),
    }),

  /** Dismiss a specific toast (or all if no id). */
  dismiss: (id?: string | number) => toast.dismiss(id),
};

export { toast };

/**
 * VRField — Vehicle Request form field wrapper
 * --------------------------------------------
 * Domain-specific wrapper around the shared `ValidatedField` pattern, but
 * tuned for the Vehicle Request form's visual language:
 *
 *   • Themed label (text-foreground / text-primary on focus / text-destructive on error)
 *   • Optional leading icon (lucide) — matches the rest of the form
 *   • Optional `FieldHint` (the (i)-on-hover tooltip used elsewhere)
 *   • Required asterisk
 *   • Inline success tick when the field has a non-empty value and no error
 *   • Inline destructive error message + AlertCircle, with role="alert"
 *   • Wires `id`, `aria-invalid`, `aria-describedby` onto the single child
 *
 * It deliberately wraps a SINGLE child (the actual <Input>, <Select…Trigger>,
 * <Textarea>, etc.) so callers keep full control of the input's own props
 * (value, onChange, onBlur). No business logic lives here.
 */
import * as React from "react";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { FieldHint } from "@/components/ui/field-hint";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface VRFieldProps {
  id: string;
  label: React.ReactNode;
  /** Render a leading icon next to the label (matches the other VR sections). */
  icon?: LucideIcon;
  required?: boolean;
  /** Error string from `useVehicleRequestValidation().getError(field)`. */
  error?: string;
  /** Considered "filled" — drives the success tick. Defaults to a truthy check on the child's `value`. */
  filled?: boolean;
  /** Optional helper text rendered when there is no error. */
  hint?: React.ReactNode;
  /** Tooltip body for the (i) hover hint. */
  tooltip?: React.ReactNode;
  /** Tooltip tone — forwarded to FieldHint. */
  tooltipTone?: "muted" | "warning";
  className?: string;
  children: React.ReactElement<any>;
}

export function VRField({
  id,
  label,
  icon: Icon,
  required,
  error,
  filled,
  hint,
  tooltip,
  tooltipTone,
  className,
  children,
}: VRFieldProps) {
  const errorId = `${id}-error`;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = error ? errorId : hintId;

  // Auto-detect "filled" from the child's `value` prop unless caller overrides.
  const childValue = (children.props as any)?.value;
  const isFilled =
    filled !== undefined
      ? filled
      : Array.isArray(childValue)
        ? childValue.length > 0
        : childValue != null && childValue !== "";

  const status: "neutral" | "success" | "error" = error
    ? "error"
    : isFilled
      ? "success"
      : "neutral";

  const childExtraClass =
    status === "error"
      ? "border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive/40"
      : status === "success"
        ? "border-success/60 focus-visible:ring-success/30"
        : "";

  const enhancedChild = React.cloneElement(children, {
    id: (children.props as any).id ?? id,
    "aria-invalid": status === "error" || undefined,
    "aria-describedby": describedBy,
    className: cn((children.props as any).className, childExtraClass),
  });

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={id}
        className={cn(
          "text-primary font-medium text-sm flex items-center gap-1.5 leading-tight",
        )}
      >
        {Icon && <Icon className="w-4 h-4 shrink-0" />}
        <span>{label}</span>
        {required && <span className="text-destructive">*</span>}
        {tooltip && <FieldHint tone={tooltipTone}>{tooltip}</FieldHint>}
      </Label>

      <div className="relative">
        {enhancedChild}
        {status === "success" && (
          <CheckCircle2
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-4 text-success",
              (children.props as any)?.type === "number" ? "right-7" : "right-2.5",
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-destructive animate-fade-in"
        >
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

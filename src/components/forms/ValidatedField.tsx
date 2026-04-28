/**
 * ValidatedField — shared form field wrapper used across operational request forms
 * --------------------------------------------------------------------------------
 * Single source of truth for the "label + leading icon + required asterisk +
 * tooltip + inline success tick + inline destructive error" layout that the
 * Vehicle Request form established. Every other request form (Fuel,
 * Maintenance, Roadside, Safety/Comfort, Inspection, Work Request) now
 * consumes this component so the UX is identical.
 *
 * Wraps a SINGLE child input and only:
 *   • adds id / aria-invalid / aria-describedby
 *   • appends an error/success border class
 *   • renders the success tick + error message
 *
 * It intentionally has no business logic — the parent owns value, onChange,
 * onBlur and the validation hook.
 */
import * as React from "react";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { FieldHint } from "@/components/ui/field-hint";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface ValidatedFieldProps {
  id: string;
  label: React.ReactNode;
  /** Render a leading icon next to the label. */
  icon?: LucideIcon;
  required?: boolean;
  /** Error string from the parent's validation hook (already gated on touched). */
  error?: string;
  /** Considered "filled" — drives the success tick. Defaults to truthy `value` on the child. */
  filled?: boolean;
  /** Helper text rendered when there is no error. */
  hint?: React.ReactNode;
  /** Tooltip body for the (i) hover hint. */
  tooltip?: React.ReactNode;
  /** Tooltip tone — forwarded to FieldHint. */
  tooltipTone?: "muted" | "warning";
  className?: string;
  children: React.ReactElement<any>;
}

export function ValidatedField({
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
}: ValidatedFieldProps) {
  const errorId = `${id}-error`;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = error ? errorId : hintId;

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
        className="text-primary font-medium text-sm flex items-center gap-1.5 leading-tight"
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

export default ValidatedField;

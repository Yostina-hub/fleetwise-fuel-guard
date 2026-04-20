/**
 * ValidatedField — drop-in field wrapper used by the vehicle registration form.
 *
 * Mirrors the InviteUserDialog UX:
 *   - Label (with optional required asterisk)
 *   - Slot for the input (passed as children)
 *   - Inline success check when the field is valid + non-empty
 *   - Inline destructive error message + AlertCircle icon when invalid
 *   - Wires aria-invalid / aria-describedby for screen readers
 *
 * The wrapped <input> still owns its own props; this component only adds
 * the surrounding chrome (label, status icon, error block).
 */
import * as React from "react";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type FieldStatus = "neutral" | "success" | "error";

interface ValidatedFieldProps {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  error?: string;
  status?: FieldStatus;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function ValidatedField({
  id,
  label,
  required,
  error,
  status = "neutral",
  hint,
  className,
  children,
}: ValidatedFieldProps) {
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = error ? errorId : hintId;

  // Inject id, aria-* and a status-aware className into the (single) child input/select
  const child = React.Children.only(children) as React.ReactElement<any>;
  const childExtraClass =
    status === "error"
      ? "border-destructive focus-visible:ring-destructive/30"
      : status === "success"
        ? "border-success/60 focus-visible:ring-success/30"
        : "";

  const enhancedChild = React.cloneElement(child, {
    id: child.props.id ?? id,
    "aria-invalid": status === "error" || undefined,
    "aria-describedby": describedBy,
    className: cn(child.props.className, childExtraClass),
  });

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={cn("text-sm", status === "error" && "text-destructive")}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>

      <div className="relative">
        {enhancedChild}
        {status === "success" && (
          <CheckCircle2
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-success"
            aria-hidden="true"
          />
        )}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-[11px] font-medium text-destructive"
        >
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[11px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

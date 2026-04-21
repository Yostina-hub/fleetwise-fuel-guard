/**
 * FieldHint — small (i) icon next to form labels that reveals a tooltip
 * with field-level guidance on hover/focus. Extracted from
 * VehicleRequestForm so any form across the app can drop it in
 * for consistent UX (issue #33 — "Hints are not clearly presented to users").
 */
import * as React from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldHintProps {
  children: React.ReactNode;
  tone?: "muted" | "warning";
  /** Optional aria-label override (defaults to "More info"). */
  label?: string;
}

export const FieldHint = ({
  children,
  tone = "muted",
  label = "More info",
}: FieldHintProps) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={
            "inline-flex items-center justify-center rounded-full transition-colors " +
            (tone === "warning"
              ? "text-warning hover:text-warning/80"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default FieldHint;

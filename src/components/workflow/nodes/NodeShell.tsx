import { memo } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { categoryLabel, statusTokenFor } from "../nodeAccents";
import type { WorkflowNodeData } from "../types";

interface NodeShellProps {
  data: WorkflowNodeData;
  selected?: boolean;
  accentToken: string;
  /** Visual silhouette: rectangular cards for actions, hex-cut for triggers, diamond-corner for decisions. */
  shape?: "rect" | "trigger" | "decision";
  /** Slot rendered after the description (e.g. true/false labels). */
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Shared visual chrome for every workflow node.
 * Uses CSS variables (--node-*, --status-*) so light/dark/cyber themes work.
 */
export const NodeShell = memo(function NodeShell({
  data, selected, accentToken, shape = "rect", footer, children,
}: NodeShellProps) {
  const accent = `hsl(var(${accentToken}))`;
  const accentSoft = `hsl(var(${accentToken}) / 0.12)`;
  const accentRing = `hsl(var(${accentToken}) / 0.25)`;
  const status = data.status;
  const statusToken = statusTokenFor(status);

  return (
    <div
      className={cn(
        "group relative w-[240px] rounded-xl border bg-card text-card-foreground transition-all duration-200",
        "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.25)]",
        selected && "ring-2 ring-primary/60 shadow-[0_8px_28px_-4px_hsl(var(--primary)/0.35)] scale-[1.02]",
        status === "running" && "animate-pulse",
      )}
      style={{
        borderColor: selected ? "hsl(var(--primary))" : accentRing,
      }}
    >
      {/* Top accent bar — wider for triggers, full for actions, diamond-cut for decisions */}
      <div
        className={cn(
          "h-1.5 w-full rounded-t-[10px]",
          shape === "trigger" && "rounded-tl-2xl",
          shape === "decision" && "rounded-t-md",
        )}
        style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent} 60%, hsl(var(${accentToken}) / 0.6) 100%)` }}
      />

      {/* Status pip (top-right) */}
      {status && status !== "idle" && (
        <div
          className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card shadow-sm"
          style={{ backgroundColor: `hsl(var(${statusToken}))` }}
          title={`Status: ${status}`}
        >
          {status === "running" && <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />}
          {status === "success" && <CheckCircle2 className="h-3 w-3 text-white" />}
          {status === "error" && <AlertCircle className="h-3 w-3 text-white" />}
        </div>
      )}

      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base font-medium"
            style={{ backgroundColor: accentSoft, color: accent }}
          >
            <span>{data.icon || "⚙️"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: accent }}
            >
              {categoryLabel(data.category)}
            </div>
            <div className="text-sm font-semibold leading-snug text-foreground break-words">
              {data.label}
            </div>
          </div>
          {data.isConfigured && (
            <div
              className="h-2 w-2 rounded-full mt-1.5 shrink-0"
              style={{ backgroundColor: "hsl(var(--status-done))" }}
              title="Configured"
            />
          )}
        </div>
        {data.description && (
          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {data.description}
          </p>
        )}
        {footer}
      </div>
      {children}
    </div>
  );
});

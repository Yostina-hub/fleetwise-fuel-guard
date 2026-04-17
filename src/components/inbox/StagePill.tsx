import { cn } from "@/lib/utils";

interface StagePillProps {
  stageId?: string | null;
  total?: number;
  className?: string;
}

/** Tries to extract a stage number from common id patterns: s1_intake, stage_2, 03_xxx. */
function stageNumber(id?: string | null): string | null {
  if (!id) return null;
  const m = id.match(/(?:^|[^a-z0-9])(\d{1,3})(?=[^0-9]|$)/i);
  return m ? m[1] : null;
}

export function StagePill({ stageId, total, className }: StagePillProps) {
  const n = stageNumber(stageId);
  if (!n) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground tabular-nums",
        className,
      )}
      title={stageId ?? undefined}
    >
      {total ? `${n}/${total}` : `#${n}`}
    </span>
  );
}

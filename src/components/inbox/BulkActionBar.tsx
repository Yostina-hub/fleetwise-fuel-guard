import { X, Trash2, UserPlus, MessageSquarePlus, ArchiveRestore, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  onCancel?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onPurge?: () => void;
  onReassign?: () => void;
  onAddNote?: () => void;
  busy?: boolean;
  /** "active" = pending/completed inbox; "trash" = recycle bin */
  mode?: "active" | "trash";
}

export function BulkActionBar({
  count, onClear, onCancel, onArchive, onRestore, onPurge,
  onReassign, onAddNote, busy, mode = "active",
}: BulkActionBarProps) {
  if (count === 0) return null;
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 shadow-[var(--shadow-elevated)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={onClear} aria-label="Clear">
        <X className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium tabular-nums">{count} selected</span>
      <span className="h-5 w-px bg-border mx-1" />

      {mode === "active" ? (
        <>
          {onAddNote && (
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={onAddNote} disabled={busy}>
              <MessageSquarePlus className="h-3.5 w-3.5" /> Add note
            </Button>
          )}
          {onReassign && (
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={onReassign} disabled={busy}>
              <UserPlus className="h-3.5 w-3.5" /> Reassign
            </Button>
          )}
          {onArchive && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onArchive}
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5" /> Move to bin
            </Button>
          )}
        </>
      ) : (
        <>
          {onRestore && (
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={onRestore} disabled={busy}>
              <ArchiveRestore className="h-3.5 w-3.5" /> Restore
            </Button>
          )}
          {onPurge && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onPurge}
              disabled={busy}
            >
              <Flame className="h-3.5 w-3.5" /> Delete forever
            </Button>
          )}
        </>
      )}
    </div>
  );
}

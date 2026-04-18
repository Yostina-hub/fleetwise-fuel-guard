import { Save, RotateCcw } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";

interface Props {
  restoredAt: string | null;
  savedAt: string | null;
  onClear: () => void;
}

/**
 * Compact "Draft saved 12s ago" indicator with a "Discard draft" reset button.
 * Renders nothing if no draft is in play yet.
 */
export function DraftStatus({ restoredAt, savedAt, onClear }: Props) {
  if (!savedAt && !restoredAt) return null;
  const ts = savedAt || restoredAt!;
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-[11px]">
      <div className="flex items-center gap-1.5 text-foreground/80 min-w-0">
        <Save className="h-3 w-3 text-primary shrink-0" />
        <span className="truncate">
          {restoredAt && !savedAt
            ? `Draft restored from ${formatDistanceToNowStrict(new Date(restoredAt))} ago`
            : `Draft saved ${formatDistanceToNowStrict(new Date(ts))} ago`}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-1.5 text-[10px] gap-1"
        onClick={onClear}
      >
        <RotateCcw className="h-3 w-3" />
        Discard
      </Button>
    </div>
  );
}

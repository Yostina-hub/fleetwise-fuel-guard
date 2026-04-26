import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Pencil, SkipForward, Ban } from "lucide-react";
import {
  CONFLICT_STRATEGY_DESCRIPTIONS,
  CONFLICT_STRATEGY_LABELS,
  type ConflictStrategy,
  type DuplicateRowInfo,
} from "./duplicateDetection";

interface Props {
  /** Singular noun shown in the UI, e.g. "vehicle" or "driver" */
  entityLabel: string;
  /** Field used to detect duplicates, e.g. "plate number" */
  keyLabel: string;
  duplicates: DuplicateRowInfo[];
  newCount: number;
  strategy: ConflictStrategy;
  onStrategyChange: (s: ConflictStrategy) => void;
  /** Disable the radio while an import is in flight */
  disabled?: boolean;
}

const STRATEGY_ICONS: Record<ConflictStrategy, JSX.Element> = {
  update: <Pencil className="w-3.5 h-3.5" />,
  skip: <SkipForward className="w-3.5 h-3.5" />,
  reject: <Ban className="w-3.5 h-3.5" />,
};

export default function ConflictStrategyPicker({
  entityLabel,
  keyLabel,
  duplicates,
  newCount,
  strategy,
  onStrategyChange,
  disabled,
}: Props) {
  const dupCount = duplicates.length;

  if (dupCount === 0) {
    return (
      <Alert className="border-success/30 bg-success/5">
        <AlertDescription className="text-xs flex items-center gap-2">
          <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">
            No duplicates
          </Badge>
          All {newCount} {entityLabel}
          {newCount === 1 ? "" : "s"} are new — they will be inserted.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {dupCount} duplicate {entityLabel}
            {dupCount === 1 ? "" : "s"} detected
          </p>
          <p className="text-xs text-muted-foreground">
            Matched against existing records by {keyLabel}.{" "}
            {newCount > 0 ? (
              <>
                {newCount} new {entityLabel}
                {newCount === 1 ? "" : "s"} will still be inserted.
              </>
            ) : (
              <>No new {entityLabel}s in this file.</>
            )}
          </p>
        </div>
      </div>

      {/* Sample of duplicates */}
      <ScrollArea className="max-h-28 border rounded bg-background/40 p-2">
        <div className="flex flex-wrap gap-1">
          {duplicates.slice(0, 30).map((d) => (
            <Badge
              key={`${d.rowNumber}-${d.keyValue}`}
              variant="outline"
              className="text-xs font-mono"
              title={`Row ${d.rowNumber}`}
            >
              {d.keyValue}
            </Badge>
          ))}
          {duplicates.length > 30 && (
            <span className="text-xs text-muted-foreground italic self-center">
              +{duplicates.length - 30} more
            </span>
          )}
        </div>
      </ScrollArea>

      <div className="space-y-2">
        <p className="text-xs font-medium">How should we handle duplicates?</p>
        <RadioGroup
          value={strategy}
          onValueChange={(v) => onStrategyChange(v as ConflictStrategy)}
          disabled={disabled}
          className="space-y-1.5"
        >
          {(Object.keys(CONFLICT_STRATEGY_LABELS) as ConflictStrategy[]).map(
            (s) => (
              <Label
                key={s}
                htmlFor={`conflict-${s}`}
                className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors ${
                  strategy === s
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <RadioGroupItem
                  id={`conflict-${s}`}
                  value={s}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {STRATEGY_ICONS[s]}
                    {CONFLICT_STRATEGY_LABELS[s]}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {CONFLICT_STRATEGY_DESCRIPTIONS[s]}
                  </p>
                </div>
              </Label>
            ),
          )}
        </RadioGroup>
      </div>
    </div>
  );
}

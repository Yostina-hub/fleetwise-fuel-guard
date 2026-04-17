import { useState } from "react";
import { Maximize2, Minus, Plus, Layout as LayoutIcon, AlertCircle, MoveHorizontal, MoveVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CanvasProblem } from "./canvasLayout";

interface CanvasToolbarProps {
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAutoLayout: (direction: "TB" | "LR") => void;
  problems: CanvasProblem[];
  onJumpToProblem?: (nodeId: string) => void;
  nodeCount: number;
  edgeCount: number;
}

/**
 * Floating control HUD anchored bottom-right of the canvas.
 * Replaces the default React Flow Controls with a denser, themed bar.
 */
export function CanvasToolbar({
  onFitView, onZoomIn, onZoomOut, onAutoLayout,
  problems, onJumpToProblem, nodeCount, edgeCount,
}: CanvasToolbarProps) {
  const [problemsOpen, setProblemsOpen] = useState(false);
  const hasProblems = problems.length > 0;

  return (
    <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
      {/* Stats chip */}
      <div className="pointer-events-auto rounded-full border border-border bg-card/90 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-md backdrop-blur tabular-nums">
        {nodeCount} {nodeCount === 1 ? "node" : "nodes"} · {edgeCount} {edgeCount === 1 ? "edge" : "edges"}
      </div>

      {/* Problems chip */}
      <Popover open={problemsOpen} onOpenChange={setProblemsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-md backdrop-blur transition-colors",
              hasProblems
                ? "border-[hsl(var(--status-failed)/0.4)] bg-[hsl(var(--status-failed)/0.12)] text-[hsl(var(--status-failed))] hover:bg-[hsl(var(--status-failed)/0.2)]"
                : "border-border bg-card/90 text-muted-foreground hover:bg-card",
            )}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {hasProblems ? `${problems.length} ${problems.length === 1 ? "problem" : "problems"}` : "No problems"}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-72 p-0">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold">
            Validation
          </div>
          {hasProblems ? (
            <ScrollArea className="max-h-64">
              <ul className="py-1">
                {problems.map((p, i) => (
                  <li key={`${p.nodeId}-${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToProblem?.(p.nodeId);
                        setProblemsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground mb-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--status-failed))]" />
                        {p.nodeId}
                      </div>
                      <div className="text-foreground">{p.message}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              All nodes look good ✨
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Zoom + layout cluster */}
      <div className="pointer-events-auto inline-flex items-center rounded-full border border-border bg-card/90 shadow-md backdrop-blur p-0.5">
        <ToolBtn label="Auto-layout vertical" onClick={() => onAutoLayout("TB")}>
          <MoveVertical className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Auto-layout horizontal" onClick={() => onAutoLayout("LR")}>
          <MoveHorizontal className="h-3.5 w-3.5" />
        </ToolBtn>
        <Separator orientation="vertical" className="mx-0.5 h-4" />
        <ToolBtn label="Zoom out" onClick={onZoomOut}><Minus className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn label="Zoom in" onClick={onZoomIn}><Plus className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn label="Fit view" onClick={onFitView}><Maximize2 className="h-3.5 w-3.5" /></ToolBtn>
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7 rounded-full hover:bg-muted"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

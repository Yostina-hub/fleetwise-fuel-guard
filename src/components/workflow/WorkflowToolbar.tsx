import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Play,
  Pause,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Download,
  Upload,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowToolbarProps {
  workflowName: string;
  onNameChange: (name: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  onSave: () => void;
  onRun: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: () => void;
  onDuplicate: () => void;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  nodeCount: number;
  edgeCount: number;
}

export const WorkflowToolbar = ({
  workflowName,
  onNameChange,
  status,
  onStatusChange,
  onSave,
  onRun,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onClear,
  onExport,
  onImport,
  onDuplicate,
  isSaving,
  canUndo,
  canRedo,
  nodeCount,
  edgeCount,
}: WorkflowToolbarProps) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border flex-wrap">
      {/* Name */}
      <Input
        value={workflowName}
        onChange={(e) => onNameChange(e.target.value)}
        className="h-8 w-48 text-sm font-medium"
        placeholder="Workflow name..."
      />

      {/* Status */}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="paused">Paused</SelectItem>
        </SelectContent>
      </Select>

      <div className="h-5 w-px bg-border" />

      {/* Undo/Redo */}
      <Button size="sm" variant="ghost" onClick={onUndo} disabled={!canUndo} className="h-8 w-8 p-0">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onRedo} disabled={!canRedo} className="h-8 w-8 p-0">
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="h-5 w-px bg-border" />

      {/* Zoom */}
      <Button size="sm" variant="ghost" onClick={onZoomOut} className="h-8 w-8 p-0">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onZoomIn} className="h-8 w-8 p-0">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onFitView} className="h-8 w-8 p-0">
        <Maximize2 className="h-4 w-4" />
      </Button>

      <div className="h-5 w-px bg-border" />

      {/* Actions */}
      <Button size="sm" variant="ghost" onClick={onExport} className="h-8 w-8 p-0">
        <Download className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onImport} className="h-8 w-8 p-0">
        <Upload className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onDuplicate} className="h-8 w-8 p-0">
        <Copy className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stats */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-[10px] h-5">
          {nodeCount} nodes
        </Badge>
        <Badge variant="secondary" className="text-[10px] h-5">
          {edgeCount} connections
        </Badge>
      </div>

      {/* Run & Save */}
      <Button
        size="sm"
        variant="outline"
        onClick={onRun}
        disabled={status !== "active"}
        className="h-8 gap-1.5"
      >
        {status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {status === "active" ? "Pause" : "Run"}
      </Button>
      <Button size="sm" onClick={onSave} disabled={isSaving} className="h-8 gap-1.5">
        <Save className="h-3.5 w-3.5" />
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
};

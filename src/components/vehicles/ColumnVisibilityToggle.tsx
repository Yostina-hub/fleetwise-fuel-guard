import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Columns3 } from "lucide-react";

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Can't be hidden
}

interface ColumnVisibilityToggleProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
}

const ColumnVisibilityToggle = ({ columns, onChange }: ColumnVisibilityToggleProps) => {
  const toggleColumn = (key: string) => {
    onChange(
      columns.map(col =>
        col.key === key && !col.locked ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const visibleCount = columns.filter(c => c.visible).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <Columns3 className="w-4 h-4" />
          <span className="text-xs">{visibleCount}/{columns.length}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="text-xs font-medium text-muted-foreground px-2 pb-2">Toggle Columns</div>
        <div className="space-y-1 max-h-[300px] overflow-auto">
          {columns.map(col => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
            >
              <Checkbox
                checked={col.visible}
                disabled={col.locked}
                onCheckedChange={() => toggleColumn(col.key)}
              />
              <span className={col.locked ? "text-muted-foreground" : ""}>{col.label}</span>
              {col.locked && <span className="text-[9px] text-muted-foreground ml-auto">Required</span>}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColumnVisibilityToggle;

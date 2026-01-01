import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Wrench, XCircle } from "lucide-react";

interface QuickStatusChangeProps {
  vehicleId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active", icon: CheckCircle, color: "text-success" },
  { value: "maintenance", label: "Maintenance", icon: Wrench, color: "text-warning" },
  { value: "inactive", label: "Inactive", icon: XCircle, color: "text-muted-foreground" },
];

export const QuickStatusChange = ({
  vehicleId,
  currentStatus,
  onStatusChange,
}: QuickStatusChangeProps) => {
  const [status, setStatus] = useState(currentStatus);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return;

    setUpdating(true);
    const { error } = await supabase
      .from("vehicles")
      .update({ status: newStatus })
      .eq("id", vehicleId);

    if (error) {
      toast.error("Failed to update status", { description: error.message });
    } else {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      const statusLabel = STATUS_OPTIONS.find(s => s.value === newStatus)?.label;
      toast.success(`Status updated to ${statusLabel}`);
    }

    setUpdating(false);
  };

  const currentOption = STATUS_OPTIONS.find(s => s.value === status);
  const Icon = currentOption?.icon || CheckCircle;

  return (
    <Select
      value={status}
      onValueChange={handleStatusChange}
      disabled={updating}
    >
      <SelectTrigger className="w-[140px] h-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${currentOption?.color}`} />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {STATUS_OPTIONS.map((option) => {
          const OptionIcon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <OptionIcon className={`w-4 h-4 ${option.color}`} />
                {option.label}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
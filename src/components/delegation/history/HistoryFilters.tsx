import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Search } from "lucide-react";
import type { HistoryFilters } from "./types";

type Props = {
  filters: HistoryFilters;
  onChange: (next: HistoryFilters) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
};

const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Sources" },
  { value: "authority_matrix", label: "Authority Rules" },
  { value: "delegation_matrix", label: "Substitutions" },
  { value: "user_substitutions", label: "User Substitutions" },
  { value: "approval_levels", label: "Approval Levels" },
  { value: "fuel_request", label: "Fuel Request" },
  { value: "fuel_wo", label: "Fuel Work Order" },
  { value: "fuel_emoney", label: "Fuel e-Money" },
  { value: "vehicle_request", label: "Vehicle Request" },
  { value: "tire_request", label: "Tire Request" },
  { value: "fleet_transfer", label: "Fleet Transfer" },
  { value: "fleet_inspection", label: "Fleet Inspection" },
  { value: "safety_comfort", label: "Safety & Comfort" },
  { value: "outsource_payment_request", label: "Outsource Payment" },
  { value: "work_order", label: "Work Order" },
  { value: "trip_request", label: "Trip Request" },
];

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
  { value: "activate", label: "Activated" },
  { value: "deactivate", label: "Deactivated" },
  { value: "route", label: "Routed" },
  { value: "approve", label: "Approved" },
  { value: "reject", label: "Rejected" },
  { value: "substitute", label: "Delegated" },
  { value: "skip", label: "Skipped" },
  { value: "escalate", label: "Escalated" },
];

export const HistoryFiltersBar = ({ filters, onChange, onRefresh, isRefreshing }: Props) => (
  <div className="flex flex-wrap gap-2 items-center">
    <div className="relative flex-1 min-w-[240px] max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search by entity, actor, scope..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="pl-9"
      />
    </div>
    <Select
      value={filters.source}
      onValueChange={(value) => onChange({ ...filters, source: value })}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Source" />
      </SelectTrigger>
      <SelectContent>
        {SOURCE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select
      value={filters.action}
      onValueChange={(value) => onChange({ ...filters, action: value })}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Action" />
      </SelectTrigger>
      <SelectContent>
        {ACTION_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button
      variant="outline"
      size="icon"
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-label="Refresh history"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>
  </div>
);

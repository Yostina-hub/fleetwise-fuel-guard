import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, SlidersHorizontal, X, CalendarIcon, RotateCcw } from "lucide-react";
import { format, subDays, subMonths, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import type { UserProfile } from "./UserTable";

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "org_admin", label: "Org Admin" },
  { value: "operator", label: "Operator" },
  { value: "fleet_manager", label: "Fleet Manager" },
  { value: "driver", label: "Driver" },
  { value: "technician", label: "Technician" },
  { value: "viewer", label: "Viewer" },
  { value: "mechanic", label: "Mechanic" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "assigned", label: "Has Roles" },
  { value: "unassigned", label: "No Roles" },
];

const DATE_PRESETS = [
  { value: "all", label: "Any Time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "custom", label: "Custom Range" },
];

export interface FilterState {
  search: string;
  role: string;
  status: string;
  datePreset: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  sortBy: string;
  sortDir: "asc" | "desc";
}

const defaultFilters: FilterState = {
  search: "",
  role: "all",
  status: "all",
  datePreset: "all",
  dateFrom: undefined,
  dateTo: undefined,
  sortBy: "name",
  sortDir: "asc",
};

// Order option labels depend on the chosen sort field, so the dropdown stays
// intuitive (A–Z for text fields, Newest/Oldest for dates, High/Low for counts).
const ORDER_LABELS: Record<string, { asc: string; desc: string }> = {
  name: { asc: "A → Z", desc: "Z → A" },
  email: { asc: "A → Z", desc: "Z → A" },
  roles: { asc: "Fewest first", desc: "Most first" },
  created_at: { asc: "Oldest first", desc: "Newest first" },
};

interface UserFiltersProps {
  users: UserProfile[];
  onFilteredUsersChange: (users: UserProfile[]) => void;
  onPageReset: () => void;
}

const UserFilters = ({ users, onFilteredUsersChange, onPageReset }: UserFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.role !== "all") count++;
    if (filters.status !== "all") count++;
    if (filters.datePreset !== "all") count++;
    if (filters.sortBy !== "name" || filters.sortDir !== "asc") count++;
    return count;
  }, [filters]);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    onPageReset();
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    onPageReset();
  };

  const removeFilter = (key: keyof FilterState) => {
    setFilters(prev => ({ ...prev, [key]: defaultFilters[key] }));
    if (key === "datePreset") {
      setFilters(prev => ({ ...prev, dateFrom: undefined, dateTo: undefined, datePreset: "all" }));
    }
    onPageReset();
  };

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(u =>
        u.email.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    }

    if (filters.role !== "all") {
      result = result.filter(u => u.user_roles.some(r => r.role === filters.role));
    }

    if (filters.status === "assigned") {
      result = result.filter(u => u.user_roles.length > 0);
    } else if (filters.status === "unassigned") {
      result = result.filter(u => u.user_roles.length === 0);
    }

    const getDateRange = (): { from?: Date; to?: Date } => {
      switch (filters.datePreset) {
        case "today": return { from: startOfDay(new Date()), to: endOfDay(new Date()) };
        case "7d": return { from: subDays(new Date(), 7) };
        case "30d": return { from: subDays(new Date(), 30) };
        case "90d": return { from: subMonths(new Date(), 3) };
        case "custom": return { from: filters.dateFrom, to: filters.dateTo };
        default: return {};
      }
    };
    const range = getDateRange();
    if (range.from) {
      result = result.filter(u => isAfter(new Date(u.created_at), range.from!));
    }
    if (range.to) {
      result = result.filter(u => isBefore(new Date(u.created_at), endOfDay(range.to!)));
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (filters.sortBy) {
        case "name": cmp = (a.full_name || "").localeCompare(b.full_name || ""); break;
        case "email": cmp = a.email.localeCompare(b.email); break;
        case "roles": cmp = a.user_roles.length - b.user_roles.length; break;
        case "created_at":
        default: cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return filters.sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [users, filters]);

  useMemo(() => {
    onFilteredUsersChange(filteredUsers);
  }, [filteredUsers, onFilteredUsersChange]);

  const activeChips: { key: keyof FilterState; label: string }[] = [];
  if (filters.role !== "all") {
    activeChips.push({ key: "role", label: `Role: ${ROLE_OPTIONS.find(r => r.value === filters.role)?.label}` });
  }
  if (filters.status !== "all") {
    activeChips.push({ key: "status", label: `Status: ${STATUS_OPTIONS.find(s => s.value === filters.status)?.label}` });
  }
  if (filters.datePreset !== "all") {
    const preset = DATE_PRESETS.find(d => d.value === filters.datePreset);
    activeChips.push({
      key: "datePreset",
      label: filters.datePreset === "custom"
        ? `Date: ${filters.dateFrom ? format(filters.dateFrom, "MMM d") : "?"} – ${filters.dateTo ? format(filters.dateTo, "MMM d") : "?"}`
        : `Joined: ${preset?.label}`,
    });
  }

  return (
    <div className="space-y-3">
      <Card className="glass-strong">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone..."
                className="pl-10 h-10"
                value={filters.search}
                onChange={e => updateFilter("search", e.target.value)}
              />
              {filters.search && (
                <button
                  onClick={() => updateFilter("search", "")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {/* Role select */}
              <Select value={filters.role} onValueChange={v => updateFilter("role", v)}>
                <SelectTrigger className="w-full sm:w-[180px] h-10">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Advanced toggle */}
              <Button
                variant={showAdvanced ? "default" : "outline"}
                size="sm"
                className="gap-2 h-10 px-3 sm:px-4 shrink-0"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <Card className="glass-strong border-primary/20 animate-fade-in">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                <Select value={filters.status} onValueChange={v => updateFilter("status", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Joined</label>
                <Select value={filters.datePreset} onValueChange={v => updateFilter("datePreset", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATE_PRESETS.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filters.datePreset === "custom" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-2 font-normal">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {filters.dateFrom ? format(filters.dateFrom, "MMM d, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={filters.dateFrom} onSelect={d => updateFilter("dateFrom", d)} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-2 font-normal">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {filters.dateTo ? format(filters.dateTo, "MMM d, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={filters.dateTo} onSelect={d => updateFilter("dateTo", d)} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {filters.datePreset !== "custom" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sort By</label>
                    <Select value={filters.sortBy} onValueChange={v => updateFilter("sortBy", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Date Joined</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="roles">Role Count</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order</label>
                    <Select value={filters.sortDir} onValueChange={v => updateFilter("sortDir", v as "asc" | "desc")}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">{ORDER_LABELS[filters.sortBy]?.asc ?? "Ascending"}</SelectItem>
                        <SelectItem value="desc">{ORDER_LABELS[filters.sortBy]?.desc ?? "Descending"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {activeFilterCount > 0 && (
              <div className="flex justify-end mt-3">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeChips.map(chip => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1.5 pl-2.5 pr-1.5 py-1 text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => removeFilter(chip.key)}
            >
              {chip.label}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          <button
            onClick={resetFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default UserFilters;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Filter, X, CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FilterConfig {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  vehicleClass?: string;
  minPassengers?: number;
  searchText?: string;
}

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterConfig) => void;
  activeFilters: FilterConfig;
}

export const AdvancedFilters = ({ onFilterChange, activeFilters }: AdvancedFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<FilterConfig>(activeFilters);
  const [open, setOpen] = useState(false);

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
    setOpen(false);
  };

  const handleClearFilters = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const activeFilterCount = Object.keys(activeFilters).filter(
    (key) => activeFilters[key as keyof FilterConfig] !== undefined
  ).length;

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search requests..."
        value={localFilters.searchText || ""}
        onChange={(e) =>
          setLocalFilters({ ...localFilters, searchText: e.target.value })
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onFilterChange(localFilters);
          }
        }}
        className="max-w-xs"
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Filter Options</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={localFilters.status}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vehicle Class</Label>
                <Select
                  value={localFilters.vehicleClass}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, vehicleClass: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any class</SelectItem>
                    <SelectItem value="sedan">Sedan</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !localFilters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.dateFrom
                          ? format(localFilters.dateFrom, "MMM dd")
                          : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={localFilters.dateFrom}
                        onSelect={(date) =>
                          setLocalFilters({ ...localFilters, dateFrom: date })
                        }
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !localFilters.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.dateTo
                          ? format(localFilters.dateTo, "MMM dd")
                          : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={localFilters.dateTo}
                        onSelect={(date) =>
                          setLocalFilters({ ...localFilters, dateTo: date })
                        }
                        disabled={(date) =>
                          localFilters.dateFrom
                            ? date < localFilters.dateFrom
                            : false
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Min. Passengers</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Any"
                  value={localFilters.minPassengers || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minPassengers: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" className="flex-1" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
};

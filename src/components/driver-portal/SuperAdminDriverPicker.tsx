import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UserCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDrivers } from "@/hooks/useDrivers";

interface Props {
  viewingDriverName?: string | null;
}

/**
 * Super-admin only: pick any driver to view the portal as them.
 * Sets ?driverId=... in the URL; DriverPortal reads it to override self-lookup.
 */
export default function SuperAdminDriverPicker({ viewingDriverName }: Props) {
  const [open, setOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { drivers, loading } = useDrivers();
  const activeId = searchParams.get("driverId");

  const select = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("driverId", id);
    setSearchParams(next, { replace: true });
    setOpen(false);
  };

  const clear = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("driverId");
    setSearchParams(next, { replace: true });
  };

  if (activeId) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="destructive" className="gap-1">
          <UserCog className="h-3 w-3" />
          Viewing as Driver
        </Badge>
        <span className="text-sm font-medium">{viewingDriverName || activeId.slice(0, 8)}</span>
        <Button variant="ghost" size="sm" onClick={clear} className="h-7 gap-1">
          <X className="h-4 w-4" />
          Exit
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCog className="h-4 w-4" />
          View as Driver
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="end">
        <Command>
          <CommandInput placeholder="Search drivers..." />
          <CommandList>
            <CommandEmpty>{loading ? "Loading drivers..." : "No drivers found."}</CommandEmpty>
            <CommandGroup>
              {drivers.map((d) => {
                const name = `${d.first_name} ${d.last_name}`.trim();
                return (
                  <CommandItem
                    key={d.id}
                    value={`${name} ${d.license_number} ${d.email || ""}`}
                    onSelect={() => select(d.id)}
                    className="gap-2 cursor-pointer"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {(name || "D").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm">{name}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.license_number} · {d.status}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

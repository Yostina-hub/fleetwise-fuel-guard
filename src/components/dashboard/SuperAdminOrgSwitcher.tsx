import { Building2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export function SuperAdminOrgSwitcher() {
  const [open, setOpen] = useState(false);
  const { viewingAsOrganizationId, setViewingAsOrganizationId, isSuperAdminViewingAsOrg } =
    useOrganizationContext();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["all-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, type, active")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const selectedOrg = organizations?.find((org) => org.id === viewingAsOrganizationId);

  return (
    <div className="flex items-center gap-2">
      {isSuperAdminViewingAsOrg && (
        <Badge variant="outline" className="gap-1">
          <Building2 className="h-3 w-3" />
          Viewing as: {selectedOrg?.name}
        </Badge>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Building2 className="h-4 w-4" />
            {isSuperAdminViewingAsOrg ? "Switch Org" : "View as Org"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-64" align="end">
          <Command>
            <CommandInput placeholder="Search organizations..." />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading..." : "No organizations found."}
              </CommandEmpty>
              <CommandGroup>
                {isSuperAdminViewingAsOrg && (
                  <CommandItem
                    onSelect={() => {
                      setViewingAsOrganizationId(null);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear (Platform-wide View)
                  </CommandItem>
                )}
                {organizations?.map((org) => (
                  <CommandItem
                    key={org.id}
                    onSelect={() => {
                      setViewingAsOrganizationId(org.id);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    {viewingAsOrganizationId === org.id && (
                      <Check className="h-4 w-4" />
                    )}
                    <div className="flex flex-col">
                      <span>{org.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {org.type} • {org.slug}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

import { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/hooks/useImpersonation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function SuperAdminImpersonation() {
  const [open, setOpen] = useState(false);
  const {
    isImpersonating,
    impersonatedUserProfile,
    startImpersonation,
    endImpersonation,
  } = useImpersonation();

  const { data: users, isLoading } = useQuery({
    queryKey: ["all-users-for-impersonation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, organization_id")
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  const handleImpersonate = async (userId: string) => {
    await startImpersonation(userId);
    setOpen(false);
  };

  if (isImpersonating) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="gap-1">
          <UserCog className="h-3 w-3" />
          Impersonating
        </Badge>
        <span className="text-sm font-medium">
          {impersonatedUserProfile?.full_name || impersonatedUserProfile?.email}
        </span>
        <Button variant="ghost" size="sm" onClick={endImpersonation}>
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
          Impersonate User
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="end">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading users..." : "No users found."}
            </CommandEmpty>
            <CommandGroup>
              {users?.map((u) => (
                <CommandItem
                  key={u.id}
                  onSelect={() => handleImpersonate(u.id)}
                  className="gap-2 cursor-pointer"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {(u.full_name || u.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm">{u.full_name || u.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

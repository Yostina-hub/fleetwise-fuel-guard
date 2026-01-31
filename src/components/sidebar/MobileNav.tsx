import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./SidebarNav";
import { cn } from "@/lib/utils";
import ethioTelecomLogo from "@/assets/ethio-telecom-logo.png";
import type { NavItem, AdminItem } from "./SidebarNav";

interface MobileNavProps {
  navItems: NavItem[];
  adminItems: AdminItem[];
  isSuperAdmin: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
  userEmail?: string;
}

export function MobileNav({
  navItems,
  adminItems,
  isSuperAdmin,
  isOpen,
  onOpenChange,
  onSignOut,
  userEmail,
}: MobileNavProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 text-white/70 hover:text-white hover:bg-[#2a3a4d]"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[280px] p-0 bg-[#1a2332] border-r border-[#2a3a4d]"
      >
        <div className="flex flex-col h-full">
          {/* Header with Logo */}
          <div className="px-4 py-4 bg-[#001a33] flex items-center justify-between">
            <img
              src={ethioTelecomLogo}
              alt="ethio telecom"
              className="h-10 w-auto object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-[#2a3a4d]"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-hidden">
            <SidebarNav
              navItems={navItems}
              adminItems={adminItems}
              isSuperAdmin={isSuperAdmin}
              isDark={true}
              isCollapsed={false}
            />
          </div>

          {/* User section */}
          <div className="p-3 border-t border-[#2a3a4d]/50">
            <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-[#0d1520]">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {userEmail?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-white truncate block">
                  {userEmail}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-white/60 hover:text-white hover:bg-destructive/10"
                onClick={onSignOut}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { X, LogOut, ChevronRight } from "lucide-react";
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
  isOrgAdmin?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
  userEmail?: string;
}

export function MobileNav({
  navItems,
  adminItems,
  isSuperAdmin,
  isOrgAdmin = false,
  isOpen,
  onOpenChange,
  onSignOut,
  userEmail,
}: MobileNavProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[85vw] max-w-[320px] p-0 bg-[#0d1520] border-r border-[#2a3a4d]/50"
      >
        <div className="flex flex-col h-full pt-safe">
          {/* Header with Logo - Native style */}
          <div className="px-4 py-4 bg-[#001a33] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={ethioTelecomLogo}
                alt="ethio telecom"
                className="h-9 w-auto object-contain"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-transform touch-manipulation"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide scroll-smooth-native">
            <SidebarNav
              navItems={navItems}
              adminItems={adminItems}
              isSuperAdmin={isSuperAdmin}
              isOrgAdmin={isOrgAdmin}
              isDark={true}
              isCollapsed={false}
            />
          </div>

          {/* User section - Fixed at bottom with safe area */}
          <div className="p-3 border-t border-[#2a3a4d]/30 bg-[#0a0f16] pb-safe">
            <div 
              className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#1a2332]/80 active:bg-[#1a2332] transition-colors touch-manipulation"
              onClick={onSignOut}
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-base font-semibold text-primary">
                  {userEmail?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white truncate block">
                  {userEmail}
                </span>
                <span className="text-xs text-white/50">Tap to sign out</span>
              </div>
              <LogOut className="w-5 h-5 text-white/40" />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

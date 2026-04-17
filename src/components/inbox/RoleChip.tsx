import { cn } from "@/lib/utils";

interface RoleChipProps {
  role?: string | null;
  className?: string;
}

/** Maps known roles to a CSS variable; unknowns fall back to default. */
function tokenFor(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("driver")) return "--role-driver";
  if (r.includes("mechanic") || r.includes("technician")) return "--role-mechanic";
  if (r.includes("dispatch")) return "--role-dispatcher";
  if (r.includes("finance") || r.includes("account")) return "--role-finance";
  if (r.includes("inspector") || r.includes("ta")) return "--role-inspector";
  if (r.includes("admin")) return "--role-admin";
  if (r.includes("fleet") || r.includes("manager")) return "--role-fleet-manager";
  return "--role-default";
}

export function RoleChip({ role, className }: RoleChipProps) {
  if (!role) return null;
  const token = tokenFor(role);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={{
        backgroundColor: `hsl(var(${token}) / 0.12)`,
        color: `hsl(var(${token}))`,
        borderColor: `hsl(var(${token}) / 0.3)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: `hsl(var(${token}))` }}
      />
      {role.replace(/_/g, " ")}
    </span>
  );
}

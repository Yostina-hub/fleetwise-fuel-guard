// Cell renderers for the Drivers table. Keeps the page component lean and
// makes it easy to add/edit columns from the registry in driverTableColumns.ts.
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CreditCard, Phone, Mail, Car, Activity, Edit, Trash2, Eye,
  MoreHorizontal, CheckCircle2, XCircle, ShieldAlert,
} from "lucide-react";
import { Driver } from "@/hooks/useDrivers";
import DriverQuickStatusChange from "@/components/fleet/DriverQuickStatusChange";
import LicenseExpiryBadge from "@/components/fleet/LicenseExpiryBadge";
import { DriverColumnId } from "./driverTableColumns";

export interface CellContext {
  selected: boolean;
  onSelect: (checked: boolean) => void;
  vehicleAssignment?: { id: string; plate_number: string; make: string | null; model: string | null };
  onAssignVehicle: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onScoring: () => void;
  t: (key: string, fallback?: string) => string;
}

const initials = (f: string, l: string) =>
  `${f?.charAt(0) ?? ""}${l?.charAt(0) ?? ""}`.toUpperCase();

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  try { return format(new Date(v), "MMM d, yyyy"); } catch { return v; }
};

const fmtDateTime = (v?: string | null) => {
  if (!v) return "—";
  try { return format(new Date(v), "MMM d, yyyy HH:mm"); } catch { return v; }
};

const TruncId = ({ value }: { value?: string | null }) =>
  value ? (
    <span className="font-mono text-xs text-muted-foreground" title={value}>
      {value.slice(0, 8)}…
    </span>
  ) : (<span className="text-muted-foreground">—</span>);

const Bool = ({ value }: { value?: boolean | null }) =>
  value ? (
    <Badge className="bg-success/10 text-success border-success/20 gap-1">
      <CheckCircle2 className="w-3 h-3" /> Yes
    </Badge>
  ) : value === false ? (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <XCircle className="w-3 h-3" /> No
    </Badge>
  ) : (<span className="text-muted-foreground">—</span>);

const Mono = ({ value, className = "" }: { value?: string | number | null; className?: string }) =>
  value !== null && value !== undefined && value !== "" ? (
    <span className={`font-mono text-sm ${className}`}>{String(value)}</span>
  ) : (<span className="text-muted-foreground">—</span>);

const Plain = ({ value }: { value?: string | number | null }) =>
  value !== null && value !== undefined && value !== "" ? (
    <span className="text-sm">{String(value)}</span>
  ) : (<span className="text-muted-foreground">—</span>);

export const renderDriverCell = (
  id: DriverColumnId,
  driver: Driver,
  ctx: CellContext,
): React.ReactNode => {
  switch (id) {
    case "select":
      return (
        <Checkbox
          checked={ctx.selected}
          onCheckedChange={(c) => ctx.onSelect(!!c)}
          aria-label={`Select ${driver.first_name} ${driver.last_name}`}
        />
      );

    case "driver":
      return (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={driver.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials(driver.first_name, driver.last_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium whitespace-nowrap">
              {driver.first_name} {driver.last_name}
            </div>
            {driver.hire_date && (
              <div className="text-xs text-muted-foreground">
                Since {fmtDate(driver.hire_date)}
              </div>
            )}
          </div>
        </div>
      );

    case "first_name":   return <Plain value={driver.first_name} />;
    case "middle_name":  return <Plain value={(driver as any).middle_name} />;
    case "last_name":    return <Plain value={driver.last_name} />;
    case "gender":       return <Plain value={(driver as any).gender} />;
    case "date_of_birth": return <span className="text-sm">{fmtDate((driver as any).date_of_birth)}</span>;
    case "national_id":  return <Mono value={(driver as any).national_id} />;
    case "govt_id_type": return <Plain value={(driver as any).govt_id_type} />;
    case "avatar_url":   return driver.avatar_url ? (
      <a href={driver.avatar_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">View</a>
    ) : <span className="text-muted-foreground">—</span>;

    case "phone":
      return driver.phone ? (
        <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
          <Phone className="w-3 h-3 text-muted-foreground" />{driver.phone}
        </div>
      ) : <span className="text-muted-foreground">—</span>;

    case "email":
      return driver.email ? (
        <div className="flex items-center gap-1.5 text-sm">
          <Mail className="w-3 h-3 text-muted-foreground" />{driver.email}
        </div>
      ) : <span className="text-muted-foreground">—</span>;

    case "license_number":
      return (
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{driver.license_number || "—"}</span>
        </div>
      );
    case "license_class":   return <Plain value={driver.license_class} />;
    case "license_type":    return <Plain value={(driver as any).license_type} />;
    case "license_issue_date": return <span className="text-sm">{fmtDate((driver as any).license_issue_date)}</span>;
    case "license_expiry":  return driver.license_expiry ? <LicenseExpiryBadge expiryDate={driver.license_expiry} /> : <span className="text-muted-foreground">—</span>;
    case "license_verified": return <Bool value={(driver as any).license_verified} />;
    case "license_front_url": return (driver as any).license_front_url ? (
      <a href={(driver as any).license_front_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">Front</a>
    ) : <span className="text-muted-foreground">—</span>;
    case "license_back_url": return (driver as any).license_back_url ? (
      <a href={(driver as any).license_back_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">Back</a>
    ) : <span className="text-muted-foreground">—</span>;

    case "employee_id": return <Mono value={driver.employee_id} />;
    case "driver_type": return driver.driver_type ? (
      <Badge variant="outline" className="capitalize">{driver.driver_type.replace(/_/g, " ")}</Badge>
    ) : <span className="text-muted-foreground">—</span>;
    case "employment_type": return driver.employment_type ? (
      <Badge variant="secondary" className="capitalize">{driver.employment_type}</Badge>
    ) : <span className="text-muted-foreground">—</span>;
    case "department": return <Plain value={driver.department} />;
    case "outsource_company": return <Plain value={driver.outsource_company} />;
    case "hire_date": return <span className="text-sm">{fmtDate(driver.hire_date)}</span>;
    case "joining_date": return <span className="text-sm">{fmtDate((driver as any).joining_date)}</span>;
    case "experience_years": return <Plain value={(driver as any).experience_years} />;
    case "route_type": return <Plain value={(driver as any).route_type} />;
    case "assigned_pool": return <Plain value={(driver as any).assigned_pool} />;
    case "status": return <DriverQuickStatusChange driver={driver} />;

    case "address_region":   return <Plain value={(driver as any).address_region} />;
    case "address_zone":     return <Plain value={(driver as any).address_zone} />;
    case "address_woreda":   return <Plain value={(driver as any).address_woreda} />;
    case "address_specific": return <Plain value={(driver as any).address_specific} />;

    case "verification_status": {
      const s = (driver as any).verification_status as string | undefined;
      if (!s) return <span className="text-muted-foreground">—</span>;
      const tone = s === "verified" ? "bg-success/10 text-success border-success/20"
        : s === "pending" ? "bg-warning/10 text-warning border-warning/20"
        : "bg-destructive/10 text-destructive border-destructive/20";
      return <Badge className={`${tone} capitalize`}>{s}</Badge>;
    }
    case "national_id_verified": return <Bool value={(driver as any).national_id_verified} />;
    case "verified_at":      return <span className="text-sm">{fmtDateTime((driver as any).verified_at)}</span>;
    case "verified_by":      return <TruncId value={(driver as any).verified_by} />;
    case "verification_notes": return <Plain value={(driver as any).verification_notes} />;
    case "processing_restricted": return (driver as any).processing_restricted ? (
      <Badge variant="destructive" className="gap-1"><ShieldAlert className="w-3 h-3" />Restricted</Badge>
    ) : <Bool value={false} />;
    case "processing_restricted_at": return <span className="text-sm">{fmtDateTime((driver as any).processing_restricted_at)}</span>;
    case "processing_restricted_reason": return <Plain value={(driver as any).processing_restricted_reason} />;

    case "vehicle":
      return ctx.vehicleAssignment ? (
        <button onClick={ctx.onAssignVehicle} className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Car className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium group-hover:text-primary">{ctx.vehicleAssignment.plate_number}</div>
            <div className="text-xs text-muted-foreground">
              {[ctx.vehicleAssignment.make, ctx.vehicleAssignment.model].filter(Boolean).join(" ") || "—"}
            </div>
          </div>
        </button>
      ) : (
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={ctx.onAssignVehicle}>
          <Car className="h-3 w-3" /> Assign
        </Button>
      );

    case "safety_score": {
      const s = driver.safety_score || 0;
      const tone = s >= 80 ? "bg-success/10 text-success"
        : s >= 60 ? "bg-warning/10 text-warning"
        : "bg-destructive/10 text-destructive";
      return (
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${tone}`}>
          {driver.safety_score ?? "—"}
        </div>
      );
    }
    case "total_trips":      return <Mono value={driver.total_trips ?? 0} />;
    case "total_distance_km": return <Mono value={driver.total_distance_km ? Number(driver.total_distance_km).toFixed(1) : 0} />;

    case "bank_name":       return <Plain value={(driver as any).bank_name} />;
    case "bank_account":    return <Mono value={(driver as any).bank_account} />;
    case "telebirr_account": return <Mono value={(driver as any).telebirr_account} />;

    case "rfid_tag":     return <Mono value={driver.rfid_tag} />;
    case "ibutton_id":   return <Mono value={driver.ibutton_id} />;
    case "bluetooth_id": return <Mono value={driver.bluetooth_id} />;

    case "emergency_contact_name":  return <Plain value={driver.emergency_contact_name} />;
    case "emergency_contact_phone": return <Plain value={driver.emergency_contact_phone} />;
    case "emergency_contact_relationship": return <Plain value={driver.emergency_contact_relationship} />;

    case "blood_type": return (driver as any).blood_type || driver.medical_info?.blood_type ? (
      <Badge variant="outline" className="font-mono">{(driver as any).blood_type || driver.medical_info?.blood_type}</Badge>
    ) : <span className="text-muted-foreground">—</span>;
    case "medical_certificate_expiry": return <span className="text-sm">{fmtDate(driver.medical_certificate_expiry)}</span>;
    case "medical_info": return driver.medical_info ? (
      <span className="text-xs text-muted-foreground">Details available</span>
    ) : <span className="text-muted-foreground">—</span>;

    case "id":              return <TruncId value={driver.id} />;
    case "user_id":         return <TruncId value={driver.user_id} />;
    case "organization_id": return <TruncId value={driver.organization_id} />;
    case "notes":           return driver.notes ? (
      <span className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]" title={driver.notes}>{driver.notes}</span>
    ) : <span className="text-muted-foreground">—</span>;
    case "created_at": return <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(driver.created_at)}</span>;
    case "updated_at": return <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(driver.updated_at)}</span>;

    case "actions":
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${driver.first_name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{ctx.t("common.actions", "Actions")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={ctx.onView}><Eye className="w-4 h-4 mr-2" />View Details</DropdownMenuItem>
            <DropdownMenuItem onClick={ctx.onEdit}><Edit className="w-4 h-4 mr-2" />Edit Driver</DropdownMenuItem>
            <DropdownMenuItem onClick={ctx.onAssignVehicle}><Car className="w-4 h-4 mr-2" />Assign Vehicle</DropdownMenuItem>
            <DropdownMenuItem onClick={ctx.onScoring}><Activity className="w-4 h-4 mr-2" />View Scoring</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={ctx.onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />Delete Driver
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

    default:
      return <span className="text-muted-foreground">—</span>;
  }
};

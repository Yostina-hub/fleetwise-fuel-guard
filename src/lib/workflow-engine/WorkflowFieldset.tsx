// Shared form renderer for stage action fields & intake fields
import { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { StageField } from "./types";

interface Props {
  fields: StageField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  /** When true, autofill vehicle/driver fields from the selected vehicle/driver. */
  autofillFromEntities?: boolean;
}

export function WorkflowFieldset({ fields, values, onChange, autofillFromEntities = true }: Props) {
  const { organizationId } = useOrganization();

  const needsVehicles = useMemo(
    () => fields.some((f) => f.type === "vehicle" || f.type === "vehicle_autofill_summary"),
    [fields],
  );
  const needsDrivers = useMemo(() => fields.some((f) => f.type === "driver"), [fields]);
  const needsCatalog = useMemo(
    () => fields.some((f) => f.type === "handover_catalog" || f.type === "handover_lines_30"),
    [fields],
  );

  const { data: vehicles = [] } = useQuery({
    queryKey: ["wf-vehicles-full", organizationId],
    enabled: !!organizationId && needsVehicles,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select(
          "id, plate_number, make, model, year, vin, fuel_type, tank_capacity_liters, odometer_km, capacity_kg, vehicle_type, registration_cert_no, registration_expiry, insurance_policy_no, insurance_expiry, assigned_driver_id, color",
        )
        .eq("organization_id", organizationId!)
        .limit(500);
      return data || [];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["wf-drivers-full", organizationId],
    enabled: !!organizationId && (needsDrivers || needsVehicles),
    queryFn: async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, license_number, employee_id, national_id, phone, user_id")
        .eq("organization_id", organizationId!)
        .limit(500);
      return data || [];
    },
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ["wf-handover-catalog", organizationId],
    enabled: !!organizationId && needsCatalog,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicle_handover_catalog_items")
        .select("id, name, category, default_qty, sort_order")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  // Autofill vehicle-derived fields when a vehicle is picked.
  const selectedVehicleId = values["__vehicle_id"] || values["vehicle_id"];
  const selectedVehicle = useMemo(
    () => vehicles.find((v: any) => v.id === selectedVehicleId),
    [vehicles, selectedVehicleId],
  );

  useEffect(() => {
    if (!autofillFromEntities || !selectedVehicle) return;
    const map: Record<string, any> = {
      vehicle_type: selectedVehicle.vehicle_type,
      vehicle_model: [selectedVehicle.make, selectedVehicle.model, selectedVehicle.year]
        .filter(Boolean)
        .join(" "),
      chassis_no: selectedVehicle.vin,
      plate_no: selectedVehicle.plate_number,
      passenger_load_capacity: selectedVehicle.capacity_kg
        ? `${selectedVehicle.capacity_kg} kg`
        : undefined,
      km_reading: selectedVehicle.odometer_km,
      registration_cert_no: selectedVehicle.registration_cert_no,
      annual_inspection_expiry: selectedVehicle.registration_expiry,
      third_party_inspection_expiry: selectedVehicle.insurance_expiry,
    };
    for (const [k, v] of Object.entries(map)) {
      if (v == null || v === "") continue;
      // Only set if the field exists on the form AND user hasn't typed anything
      if (!fields.some((f) => f.key === k)) continue;
      if (values[k]) continue;
      onChange(k, v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle?.id]);

  // Driver autofill (delivered_by_name when current assigned driver is set)
  useEffect(() => {
    if (!autofillFromEntities || !selectedVehicle?.assigned_driver_id) return;
    const drv = drivers.find((d: any) => d.id === selectedVehicle.assigned_driver_id);
    if (!drv) return;
    if (fields.some((f) => f.key === "delivered_by_name") && !values.delivered_by_name) {
      onChange("delivered_by_name", `${drv.first_name} ${drv.last_name}`.trim());
    }
    if (fields.some((f) => f.key === "delivered_by_id") && !values.delivered_by_id) {
      onChange("delivered_by_id", drv.employee_id || drv.national_id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle?.assigned_driver_id, drivers.length]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {fields.map((f) => {
        const v = values[f.key] ?? "";
        const wrap = (control: React.ReactNode) => (
          <div
            key={f.key}
            className={
              f.type === "textarea" ||
              f.type === "multiselect" ||
              f.type === "handover_catalog" ||
              f.type === "handover_lines_30" ||
              f.type === "vehicle_autofill_summary"
                ? "md:col-span-2"
                : ""
            }
          >
            <Label className="text-xs">
              {f.label} {f.required ? <span className="text-destructive">*</span> : null}
            </Label>
            {control}
            {f.helpText ? (
              <p className="text-[10px] text-muted-foreground mt-1">{f.helpText}</p>
            ) : null}
          </div>
        );

        switch (f.type) {
          case "text":
          case "number":
          case "date":
          case "datetime":
            return wrap(
              <Input
                type={f.type === "datetime" ? "datetime-local" : f.type}
                value={v}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.key, e.target.value)}
              />,
            );
          case "textarea":
            return wrap(
              <Textarea
                value={v}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.key, e.target.value)}
              />,
            );
          case "checkbox":
            return wrap(
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  checked={!!v}
                  onCheckedChange={(c) => onChange(f.key, !!c)}
                />
                <span className="text-xs">{f.placeholder || f.label}</span>
              </div>,
            );
          case "select":
            return wrap(
              <Select value={v} onValueChange={(val) => onChange(f.key, val)}>
                <SelectTrigger>
                  <SelectValue placeholder={f.placeholder || "Select..."} />
                </SelectTrigger>
                <SelectContent>
                  {f.options?.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
            );
          case "multiselect": {
            const arr: string[] = Array.isArray(v) ? v : [];
            const toggle = (val: string) => {
              const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
              onChange(f.key, next);
            };
            return wrap(
              <div className="flex flex-wrap gap-1.5 border border-input rounded-md p-2 bg-background min-h-[42px]">
                {(f.options || []).map((o) => {
                  const active = arr.includes(o.value);
                  return (
                    <Badge
                      key={o.value}
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => toggle(o.value)}
                    >
                      {o.label}
                    </Badge>
                  );
                })}
                {(f.options || []).length === 0 && (
                  <span className="text-xs text-muted-foreground">No options.</span>
                )}
              </div>,
            );
          }
          case "handover_catalog": {
            const arr: string[] = Array.isArray(v) ? v : [];
            const items = f.catalogCategory
              ? catalog.filter((c: any) => c.category === f.catalogCategory)
              : catalog;
            const toggle = (id: string) => {
              const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
              onChange(f.key, next);
            };
            return wrap(
              <div className="border border-input rounded-md p-2 bg-background space-y-1">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No catalog items configured. Add some via the catalog admin.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {arr.length} of {items.length} selected
                      </span>
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline"
                        onClick={() => onChange(f.key, items.map((i: any) => i.id))}
                      >
                        Select all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                      {items.map((it: any) => {
                        const active = arr.includes(it.id);
                        return (
                          <Badge
                            key={it.id}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer select-none"
                            onClick={() => toggle(it.id)}
                          >
                            {it.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>,
            );
          }
          case "handover_lines_30": {
            // Mirrors the paper EFM/FA/03 "Fleet Safety, Comfort, Accessories
            // and Comfort Material Lists" table — exactly 30 numbered slots,
            // each with a free-form material name and a quantity, displayed
            // as two columns (1-15 left, 16-30 right) just like the SOP.
            const rows: { name: string; qty: string }[] = (() => {
              const raw = Array.isArray(v) ? v : [];
              const out: { name: string; qty: string }[] = [];
              for (let i = 0; i < 30; i++) {
                const r = raw[i] || {};
                out.push({ name: r.name ?? "", qty: r.qty ?? "" });
              }
              return out;
            })();
            const updateRow = (idx: number, patch: Partial<{ name: string; qty: string }>) => {
              const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
              onChange(f.key, next);
            };
            const renderCol = (start: number, end: number) => (
              <div className="border border-input rounded-md overflow-hidden">
                <div className="grid grid-cols-[40px_1fr_70px] bg-muted/60 text-[10px] uppercase font-semibold">
                  <div className="px-2 py-1 border-r border-input text-center">No.</div>
                  <div className="px-2 py-1 border-r border-input">List of material</div>
                  <div className="px-2 py-1 text-center">Qty</div>
                </div>
                {Array.from({ length: end - start }, (_, k) => {
                  const idx = start + k;
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-[40px_1fr_70px] border-t border-input"
                    >
                      <div className="px-2 py-0.5 text-center text-xs text-muted-foreground border-r border-input flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <input
                        className="px-2 py-1 text-xs bg-transparent outline-none border-r border-input"
                        value={rows[idx].name}
                        onChange={(e) => updateRow(idx, { name: e.target.value })}
                      />
                      <input
                        type="number"
                        min={0}
                        className="px-2 py-1 text-xs bg-transparent outline-none text-center"
                        value={rows[idx].qty}
                        onChange={(e) => updateRow(idx, { qty: e.target.value })}
                      />
                    </div>
                  );
                })}
              </div>
            );
            return wrap(
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-semibold text-center bg-muted/40 border border-input rounded px-2 py-1">
                  Fleet Safety, Comfort, Accessories and Comfort Material Lists
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {renderCol(0, 15)}
                  {renderCol(15, 30)}
                </div>
                {catalog.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Tip: catalog suggestions — {catalog.slice(0, 8).map((c: any) => c.name).join(", ")}
                    {catalog.length > 8 ? "…" : ""}
                  </p>
                )}
              </div>,
            );
          }
          case "vehicle_autofill_summary": {
            if (!selectedVehicle) {
              return wrap(
                <div className="border border-dashed border-input rounded-md p-3 text-xs text-muted-foreground">
                  Select a vehicle above to auto-fill identity fields from the fleet registry.
                </div>,
              );
            }
            return wrap(
              <div className="border border-input rounded-md p-3 bg-muted/40 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <Car className="h-3.5 w-3.5" /> Auto-fetched from fleet registry
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  <span className="text-muted-foreground">Plate</span>
                  <span>{selectedVehicle.plate_number || "—"}</span>
                  <span className="text-muted-foreground">Make / Model / Year</span>
                  <span>
                    {[selectedVehicle.make, selectedVehicle.model, selectedVehicle.year]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </span>
                  <span className="text-muted-foreground">VIN / Chassis</span>
                  <span className="font-mono">{selectedVehicle.vin || "—"}</span>
                  <span className="text-muted-foreground">Fuel</span>
                  <span>{selectedVehicle.fuel_type || "—"}</span>
                  <span className="text-muted-foreground">Capacity</span>
                  <span>
                    {selectedVehicle.capacity_kg
                      ? `${selectedVehicle.capacity_kg} kg`
                      : selectedVehicle.tank_capacity_liters
                      ? `${selectedVehicle.tank_capacity_liters} L tank`
                      : "—"}
                  </span>
                  <span className="text-muted-foreground">Odometer</span>
                  <span>
                    {selectedVehicle.odometer_km
                      ? `${Number(selectedVehicle.odometer_km).toLocaleString()} km`
                      : "—"}
                  </span>
                  <span className="text-muted-foreground">Registration</span>
                  <span>
                    {selectedVehicle.registration_cert_no || "—"}
                    {selectedVehicle.registration_expiry
                      ? ` · exp ${selectedVehicle.registration_expiry}`
                      : ""}
                  </span>
                  <span className="text-muted-foreground">Insurance</span>
                  <span>
                    {selectedVehicle.insurance_policy_no || "—"}
                    {selectedVehicle.insurance_expiry
                      ? ` · exp ${selectedVehicle.insurance_expiry}`
                      : ""}
                  </span>
                </div>
              </div>,
            );
          }
          case "vehicle":
            return wrap(
              <Select value={v} onValueChange={(val) => onChange(f.key, val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((veh: any) => (
                    <SelectItem key={veh.id} value={veh.id}>
                      {veh.plate_number} — {veh.make} {veh.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
            );
          case "driver":
            return wrap(
              <Select value={v} onValueChange={(val) => onChange(f.key, val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.first_name} {d.last_name} ({d.license_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
            );
          case "file":
            return wrap(
              <Input
                type="text"
                value={v}
                placeholder={f.placeholder || "Document URL or reference"}
                onChange={(e) => onChange(f.key, e.target.value)}
              />,
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

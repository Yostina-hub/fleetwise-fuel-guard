import { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, FileText, Hash, Loader2, MapPin, Power, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  defaultGeneratorValues,
  generatorSchema,
  type GeneratorFormValues,
  ASSET_TYPES,
  CRITICALITIES,
  ASSET_STATUSES,
  FUEL_TYPES,
  HAZARD_CLASSES,
  PPE_OPTIONS,
} from "@/lib/validation/generatorSchema";
import { useGenerators, type Generator } from "@/hooks/useGenerators";

interface GeneratorRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editGenerator?: Generator | null;
}

const RequiredMark = () => <span className="text-destructive ml-0.5">*</span>;

export const GeneratorRegistrationDialog = ({
  open,
  onOpenChange,
  editGenerator,
}: GeneratorRegistrationDialogProps) => {
  const { generators, createGenerator, updateGenerator, isMutating } = useGenerators();
  const [tab, setTab] = useState("main");

  const form = useForm<GeneratorFormValues>({
    resolver: zodResolver(generatorSchema),
    defaultValues: defaultGeneratorValues,
  });

  useEffect(() => {
    if (!open) return;
    setTab("main");
    if (editGenerator) {
      form.reset({
        ...defaultGeneratorValues,
        asset_number: editGenerator.asset_number ?? undefined,
        name: editGenerator.name ?? "",
        asset_group: editGenerator.asset_group ?? undefined,
        asset_serial_number:
          editGenerator.asset_serial_number ?? editGenerator.serial_number ?? "",
        asset_category: editGenerator.asset_category ?? undefined,
        asset_type: (editGenerator.asset_type as any) ?? "Capital",
        parent_asset_id: editGenerator.parent_asset_id ?? null,
        owning_department: editGenerator.owning_department ?? undefined,
        criticality: (editGenerator.criticality as any) ?? "medium",
        wip_accounting_class: editGenerator.wip_accounting_class ?? undefined,
        asset_status: (editGenerator.asset_status as any) ?? "CREATED",
        is_maintainable: editGenerator.is_maintainable ?? true,
        is_gis_asset: editGenerator.is_gis_asset ?? false,
        operation_log_enabled: editGenerator.operation_log_enabled ?? false,
        status: (editGenerator.status as any) ?? "active",
        warranty_expiration: editGenerator.warranty_expiration ?? undefined,
        checked_out: editGenerator.checked_out ?? false,
        model: editGenerator.model ?? undefined,
        fuel_type: (editGenerator.fuel_type as any) ?? "diesel",
        tank_capacity_liters: editGenerator.tank_capacity_liters ?? null,
        current_fuel_level_percent: editGenerator.current_fuel_level_percent ?? null,
        area: editGenerator.area ?? undefined,
        location: editGenerator.location ?? undefined,
        address: editGenerator.address ?? undefined,
        latitude: editGenerator.latitude ?? null,
        longitude: editGenerator.longitude ?? null,
        hazard_class: (editGenerator.hazard_class as any) ?? null,
        safety_notes: editGenerator.safety_notes ?? undefined,
        lockout_tagout_required: editGenerator.lockout_tagout_required ?? false,
        ppe_required: (editGenerator.ppe_required as any) ?? [],
        inspection_frequency_days: editGenerator.inspection_frequency_days ?? null,
        manufacturer: editGenerator.manufacturer ?? undefined,
        manufacture_date: editGenerator.manufacture_date ?? undefined,
        commission_date: editGenerator.commission_date ?? undefined,
        purchase_cost: editGenerator.purchase_cost ?? null,
        supplier: editGenerator.supplier ?? undefined,
        notes: editGenerator.notes ?? undefined,
      });
    } else {
      form.reset(defaultGeneratorValues);
    }
  }, [open, editGenerator, form]);

  const parentOptions = useMemo(
    () => generators.filter((g) => !editGenerator || g.id !== editGenerator.id),
    [generators, editGenerator],
  );

  const onSubmit = async (values: GeneratorFormValues) => {
    try {
      const payload: any = {
        ...values,
        tank_capacity_liters: values.tank_capacity_liters ?? null,
        current_fuel_level_percent: values.current_fuel_level_percent ?? null,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        purchase_cost: values.purchase_cost ?? null,
        inspection_frequency_days: values.inspection_frequency_days ?? null,
        warranty_expiration: values.warranty_expiration || null,
        manufacture_date: values.manufacture_date || null,
        commission_date: values.commission_date || null,
        parent_asset_id: values.parent_asset_id || null,
      };
      if (editGenerator) {
        await updateGenerator({ id: editGenerator.id, payload });
      } else {
        await createGenerator(payload);
      }
      onOpenChange(false);
    } catch {
      // toast already shown by hook
    }
  };

  const errors = form.formState.errors;
  const errMsg = (e: unknown): string | null => {
    if (!e || typeof e !== "object") return null;
    const m = (e as { message?: unknown }).message;
    return typeof m === "string" ? m : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Power className="h-5 w-5 text-primary" />
            {editGenerator ? "Edit Generator Asset" : "Define Generator Asset (eAM)"}
          </DialogTitle>
          <DialogDescription>
            Register a generator as a maintainable enterprise asset. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/40 border">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Asset Number
              </Label>
              <Input
                placeholder="Auto-generated (e.g. GEN-000001)"
                {...form.register("asset_number")}
                disabled={!!editGenerator}
              />
              {errors.asset_number && (
                <p className="text-xs text-destructive">{errMsg(errors.asset_number)}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Asset Name <RequiredMark />
              </Label>
              <Input placeholder="e.g. Main Office Backup Generator" {...form.register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errMsg(errors.name)}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Asset Group
              </Label>
              <Input placeholder="e.g. POWER-GEN" {...form.register("asset_group")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Asset Serial Number <RequiredMark />
              </Label>
              <Input placeholder="Manufacturer S/N" {...form.register("asset_serial_number")} />
              {errors.asset_serial_number && (
                <p className="text-xs text-destructive">{errMsg(errors.asset_serial_number)}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Asset Category
              </Label>
              <Input placeholder="e.g. STATIONARY-DIESEL" {...form.register("asset_category")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Asset Type
              </Label>
              <Controller
                control={form.control}
                name="asset_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="main" className="flex-1 gap-1">
                <Hash className="h-3.5 w-3.5" /> Main
              </TabsTrigger>
              <TabsTrigger value="location" className="flex-1 gap-1">
                <MapPin className="h-3.5 w-3.5" /> Location
              </TabsTrigger>
              <TabsTrigger value="safety" className="flex-1 gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Safety
              </TabsTrigger>
              <TabsTrigger value="others" className="flex-1 gap-1">
                <FileText className="h-3.5 w-3.5" /> Others
              </TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Owning Department</Label>
                  <Input placeholder="e.g. Facilities" {...form.register("owning_department")} />
                </div>
                <div className="space-y-1">
                  <Label>Criticality</Label>
                  <Controller
                    control={form.control}
                    name="criticality"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CRITICALITIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c.charAt(0).toUpperCase() + c.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label>WIP Accounting Class</Label>
                  <Input placeholder="e.g. ASSET-MAINT" {...form.register("wip_accounting_class")} />
                </div>
                <div className="space-y-1">
                  <Label>Asset Status</Label>
                  <Controller
                    control={form.control}
                    name="asset_status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Warranty Expiration</Label>
                  <Input type="date" {...form.register("warranty_expiration")} />
                </div>
                <div className="space-y-1">
                  <Label>Operational Status</Label>
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-3 bg-card">
                <div className="text-sm font-medium mb-2">Parent Asset</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Parent Asset</Label>
                    <Controller
                      control={form.control}
                      name="parent_asset_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? "__none__"}
                          onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— None —</SelectItem>
                            {parentOptions.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.asset_number ? `${g.asset_number} · ` : ""}
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/30">
                <Controller
                  control={form.control}
                  name="is_maintainable"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      Maintainable
                    </label>
                  )}
                />
                <Controller
                  control={form.control}
                  name="is_gis_asset"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      GIS Asset
                    </label>
                  )}
                />
                <Controller
                  control={form.control}
                  name="operation_log_enabled"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      Operation Log
                    </label>
                  )}
                />
                <Controller
                  control={form.control}
                  name="checked_out"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      Checked Out
                    </label>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Model</Label>
                  <Input placeholder="e.g. Cummins C150" {...form.register("model")} />
                </div>
                <div className="space-y-1">
                  <Label>Fuel Type</Label>
                  <Controller
                    control={form.control}
                    name="fuel_type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FUEL_TYPES.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f.charAt(0).toUpperCase() + f.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tank Capacity (Liters)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...form.register("tank_capacity_liters", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                  />
                  {errors.tank_capacity_liters && (
                    <p className="text-xs text-destructive">{errMsg(errors.tank_capacity_liters)}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Area</Label>
                  <Input placeholder="e.g. North Yard" {...form.register("area")} />
                </div>
                <div className="space-y-1">
                  <Label>Location (label)</Label>
                  <Input placeholder="e.g. Building A, Roof" {...form.register("location")} />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label>Address</Label>
                  <Input placeholder="Street, City" {...form.register("address")} />
                </div>
                <div className="space-y-1">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    min={-90}
                    max={90}
                    {...form.register("latitude", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                  />
                  {errors.latitude && (
                    <p className="text-xs text-destructive">{errMsg(errors.latitude)}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    min={-180}
                    max={180}
                    {...form.register("longitude", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                  />
                  {errors.longitude && (
                    <p className="text-xs text-destructive">{errMsg(errors.longitude)}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="safety" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Hazard Class</Label>
                  <Controller
                    control={form.control}
                    name="hazard_class"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "__none__"}
                        onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {HAZARD_CLASSES.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Inspection Frequency (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    {...form.register("inspection_frequency_days", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Controller
                    control={form.control}
                    name="lockout_tagout_required"
                    render={({ field }) => (
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        Lockout / Tagout required for service
                      </label>
                    )}
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label>PPE Required</Label>
                  <Controller
                    control={form.control}
                    name="ppe_required"
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-2">
                        {PPE_OPTIONS.map((opt) => {
                          const checked = (field.value ?? []).includes(opt);
                          return (
                            <button
                              type="button"
                              key={opt}
                              onClick={() => {
                                const next = checked
                                  ? (field.value ?? []).filter((v) => v !== opt)
                                  : [...(field.value ?? []), opt];
                                field.onChange(next);
                              }}
                              className="focus:outline-none"
                            >
                              <Badge
                                variant={checked ? "default" : "outline"}
                                className="cursor-pointer"
                              >
                                {opt.replace(/_/g, " ")}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label>Safety Notes</Label>
                  <Textarea rows={3} maxLength={2000} {...form.register("safety_notes")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="others" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Manufacturer</Label>
                  <Input {...form.register("manufacturer")} />
                </div>
                <div className="space-y-1">
                  <Label>Supplier</Label>
                  <Input {...form.register("supplier")} />
                </div>
                <div className="space-y-1">
                  <Label>Manufacture Date</Label>
                  <Input type="date" {...form.register("manufacture_date")} />
                </div>
                <div className="space-y-1">
                  <Label>Commission Date</Label>
                  <Input type="date" {...form.register("commission_date")} />
                </div>
                <div className="space-y-1">
                  <Label>Purchase Cost (ETB)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...form.register("purchase_cost", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Current Fuel Level (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    {...form.register("current_fuel_level_percent", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label>Notes</Label>
                  <Textarea rows={3} maxLength={2000} {...form.register("notes")} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editGenerator ? "Save Changes" : "Register Generator"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

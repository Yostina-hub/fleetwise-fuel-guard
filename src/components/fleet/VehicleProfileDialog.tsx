import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ImageOff, Truck, IdCard, Wrench, Camera, Loader2 } from "lucide-react";
import PhotoUploader from "@/components/driver-portal/PhotoUploader";
import { toast } from "sonner";

interface Props {
  vehicleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type VehicleRow = Record<string, any>;

const ANGLES: Array<{ key: "photo_front_url" | "photo_back_url" | "photo_left_url" | "photo_right_url"; label: string }> = [
  { key: "photo_front_url", label: "Front" },
  { key: "photo_back_url", label: "Back" },
  { key: "photo_left_url", label: "Left" },
  { key: "photo_right_url", label: "Right" },
];

const FUEL_TYPES = ["diesel", "petrol", "hybrid", "electric", "cng", "lpg"];
const STATUSES = ["active", "maintenance", "idle", "retired"];
const OWNERSHIP = ["owned", "ethio_telecom", "outsourced", "rented", "leased", "commercial", "government", "3pl"];
const TRANSMISSIONS = ["manual", "automatic", "amt", "cvt"];
const CONDITIONS = ["new", "good", "fair", "poor"];

export default function VehicleProfileDialog({ vehicleId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VehicleRow>({});
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle-profile", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const { data, error } = await supabase.from("vehicles").select("*").eq("id", vehicleId).single();
      if (error) throw error;
      return data as VehicleRow;
    },
    enabled: !!vehicleId && open,
  });

  useEffect(() => {
    if (vehicle) setForm(vehicle);
  }, [vehicle]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async (patch: Partial<VehicleRow>) => {
      if (!vehicleId) return;
      const { error } = await supabase.from("vehicles").update(patch).eq("id", vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["vehicle-profile", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-assets"] });
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  const uploadAngle = async (key: string, file: File) => {
    if (!vehicleId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image exceeds 5MB");
      return;
    }
    setUploadingAngle(key);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `vehicles/${vehicleId}/${key}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("vehicle-attachments").upload(path, file, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("vehicle-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl;
      if (!url) throw new Error("Failed to sign URL");
      set(key, url);
      await saveMutation.mutateAsync({ [key]: url });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingAngle(null);
    }
  };

  const handleSaveAll = () => {
    const patch: Partial<VehicleRow> = {};
    const fields = [
      "plate_number","vin","make","model","year","color","fuel_type","vehicle_type","vehicle_category",
      "transmission_type","engine_number","engine_cc","model_code","mfg_date","year_of_ownership",
      "tank_capacity_liters","odometer_km","engine_hours","seating_capacity","loading_capacity_quintal",
      "fuel_standard_km_per_liter","capacity_kg","capacity_volume","temperature_control",
      "ownership_type","status","current_condition","lifecycle_stage","safety_comfort_category",
      "acquisition_date","acquisition_cost","current_value","purchasing_price","current_market_price","depreciation_rate",
      "registration_cert_no","registration_expiry","insurance_policy_no","insurance_expiry","permit_expiry","commercial_permit",
      "rental_provider","rental_contract_number","rental_daily_rate","rental_start_date","rental_end_date",
      "notes",
    ];
    fields.forEach((f) => {
      if (form[f] !== undefined) patch[f] = form[f] === "" ? null : form[f];
    });
    saveMutation.mutate(patch);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Vehicle Profile
            {vehicle?.plate_number && <Badge variant="outline" className="font-mono">{vehicle.plate_number}</Badge>}
          </DialogTitle>
          <DialogDescription>Edit vehicle information and manage profile photos.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6">
              <Tabs defaultValue="photos">
                <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                  <TabsTrigger value="photos" className="gap-1.5"><Camera className="w-3.5 h-3.5" />Photos</TabsTrigger>
                  <TabsTrigger value="basic" className="gap-1.5"><Truck className="w-3.5 h-3.5" />Basic</TabsTrigger>
                  <TabsTrigger value="docs" className="gap-1.5"><IdCard className="w-3.5 h-3.5" />Compliance</TabsTrigger>
                  <TabsTrigger value="financial" className="gap-1.5"><Wrench className="w-3.5 h-3.5" />Financial</TabsTrigger>
                </TabsList>

                {/* PHOTOS */}
                <TabsContent value="photos" className="mt-4 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Fixed angles</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {ANGLES.map(({ key, label }) => {
                        const url = form[key];
                        const busy = uploadingAngle === key;
                        return (
                          <Card key={key} className="overflow-hidden">
                            <div className="relative aspect-square bg-muted flex items-center justify-center">
                              {url ? (
                                <img src={url} alt={`${label} view`} className="w-full h-full object-cover" />
                              ) : (
                                <ImageOff className="w-10 h-10 text-muted-foreground/40" />
                              )}
                              {busy && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                              )}
                            </div>
                            <div className="p-2 space-y-2">
                              <p className="text-xs font-medium text-center">{label}</p>
                              <label className="block">
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  disabled={busy}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadAngle(key, f);
                                    e.target.value = "";
                                  }}
                                />
                                <Button asChild size="sm" variant="outline" className="w-full cursor-pointer" disabled={busy}>
                                  <span>{url ? "Replace" : "Upload"}</span>
                                </Button>
                              </label>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-3">Extra photos</h3>
                    <PhotoUploader
                      pathPrefix={`vehicles/${vehicleId}/extras`}
                      value={Array.isArray(form.photo_extras_urls) ? form.photo_extras_urls : []}
                      onChange={async (urls) => {
                        set("photo_extras_urls", urls);
                        await saveMutation.mutateAsync({ photo_extras_urls: urls });
                      }}
                      max={20}
                      label="Add extra photos"
                    />
                  </div>
                </TabsContent>

                {/* BASIC */}
                <TabsContent value="basic" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Plate number"><Input value={form.plate_number || ""} onChange={(e) => set("plate_number", e.target.value)} /></Field>
                    <Field label="VIN"><Input value={form.vin || ""} onChange={(e) => set("vin", e.target.value)} /></Field>
                    <Field label="Make"><Input value={form.make || ""} onChange={(e) => set("make", e.target.value)} /></Field>
                    <Field label="Model"><Input value={form.model || ""} onChange={(e) => set("model", e.target.value)} /></Field>
                    <Field label="Model code"><Input value={form.model_code || ""} onChange={(e) => set("model_code", e.target.value)} /></Field>
                    <Field label="Year"><Input type="number" value={form.year || ""} onChange={(e) => set("year", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Color"><Input value={form.color || ""} onChange={(e) => set("color", e.target.value)} /></Field>
                    <Field label="Vehicle type"><Input value={form.vehicle_type || ""} onChange={(e) => set("vehicle_type", e.target.value)} /></Field>
                    <Field label="Vehicle category"><Input value={form.vehicle_category || ""} onChange={(e) => set("vehicle_category", e.target.value)} /></Field>
                    <Field label="Fuel type">
                      <Select value={form.fuel_type || ""} onValueChange={(v) => set("fuel_type", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{FUEL_TYPES.map((f) => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Transmission">
                      <Select value={form.transmission_type || ""} onValueChange={(v) => set("transmission_type", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{TRANSMISSIONS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Status">
                      <Select value={form.status || ""} onValueChange={(v) => set("status", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Condition">
                      <Select value={form.current_condition || ""} onValueChange={(v) => set("current_condition", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Engine number"><Input value={form.engine_number || ""} onChange={(e) => set("engine_number", e.target.value)} /></Field>
                    <Field label="Engine CC"><Input type="number" value={form.engine_cc || ""} onChange={(e) => set("engine_cc", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Mfg date"><Input type="date" value={form.mfg_date || ""} onChange={(e) => set("mfg_date", e.target.value)} /></Field>
                    <Field label="Tank capacity (L)"><Input type="number" step="0.1" value={form.tank_capacity_liters || ""} onChange={(e) => set("tank_capacity_liters", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Odometer (km)"><Input type="number" value={form.odometer_km || ""} onChange={(e) => set("odometer_km", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Engine hours"><Input type="number" step="0.1" value={form.engine_hours || ""} onChange={(e) => set("engine_hours", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Seating capacity"><Input type="number" value={form.seating_capacity || ""} onChange={(e) => set("seating_capacity", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Loading capacity (qt)"><Input type="number" step="0.1" value={form.loading_capacity_quintal || ""} onChange={(e) => set("loading_capacity_quintal", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Fuel standard (km/L)"><Input type="number" step="0.01" value={form.fuel_standard_km_per_liter || ""} onChange={(e) => set("fuel_standard_km_per_liter", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Capacity (kg)"><Input type="number" step="0.1" value={form.capacity_kg || ""} onChange={(e) => set("capacity_kg", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Capacity (volume m³)"><Input type="number" step="0.1" value={form.capacity_volume || ""} onChange={(e) => set("capacity_volume", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Temperature control"><Input value={form.temperature_control || ""} onChange={(e) => set("temperature_control", e.target.value)} /></Field>
                  </div>
                  <Field label="Notes">
                    <Textarea rows={3} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
                  </Field>
                </TabsContent>

                {/* COMPLIANCE */}
                <TabsContent value="docs" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Registration cert no"><Input value={form.registration_cert_no || ""} onChange={(e) => set("registration_cert_no", e.target.value)} /></Field>
                    <Field label="Registration expiry"><Input type="date" value={form.registration_expiry || ""} onChange={(e) => set("registration_expiry", e.target.value)} /></Field>
                    <Field label="Insurance policy no"><Input value={form.insurance_policy_no || ""} onChange={(e) => set("insurance_policy_no", e.target.value)} /></Field>
                    <Field label="Insurance expiry"><Input type="date" value={form.insurance_expiry || ""} onChange={(e) => set("insurance_expiry", e.target.value)} /></Field>
                    <Field label="Permit expiry"><Input type="date" value={form.permit_expiry || ""} onChange={(e) => set("permit_expiry", e.target.value)} /></Field>
                    <Field label="Commercial permit">
                      <Select value={form.commercial_permit ? "yes" : "no"} onValueChange={(v) => set("commercial_permit", v === "yes")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </TabsContent>

                {/* FINANCIAL */}
                <TabsContent value="financial" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Ownership type">
                      <Select value={form.ownership_type || ""} onValueChange={(v) => set("ownership_type", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{OWNERSHIP.map((o) => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Acquisition date"><Input type="date" value={form.acquisition_date || ""} onChange={(e) => set("acquisition_date", e.target.value)} /></Field>
                    <Field label="Acquisition cost (ETB)"><Input type="number" step="0.01" value={form.acquisition_cost || ""} onChange={(e) => set("acquisition_cost", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Purchasing price (ETB)"><Input type="number" step="0.01" value={form.purchasing_price || ""} onChange={(e) => set("purchasing_price", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Current value (ETB)"><Input type="number" step="0.01" value={form.current_value || ""} onChange={(e) => set("current_value", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Current market price (ETB)"><Input type="number" step="0.01" value={form.current_market_price || ""} onChange={(e) => set("current_market_price", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Depreciation rate (%)"><Input type="number" step="0.01" value={form.depreciation_rate || ""} onChange={(e) => set("depreciation_rate", e.target.value ? +e.target.value : null)} /></Field>
                    <Field label="Year of ownership"><Input type="number" value={form.year_of_ownership || ""} onChange={(e) => set("year_of_ownership", e.target.value ? +e.target.value : null)} /></Field>
                  </div>

                  <div className="pt-3 border-t space-y-3">
                    <h4 className="text-sm font-semibold">Rental info</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Field label="Rental provider"><Input value={form.rental_provider || ""} onChange={(e) => set("rental_provider", e.target.value)} /></Field>
                      <Field label="Contract number"><Input value={form.rental_contract_number || ""} onChange={(e) => set("rental_contract_number", e.target.value)} /></Field>
                      <Field label="Daily rate (ETB)"><Input type="number" step="0.01" value={form.rental_daily_rate || ""} onChange={(e) => set("rental_daily_rate", e.target.value ? +e.target.value : null)} /></Field>
                      <Field label="Rental start"><Input type="date" value={form.rental_start_date || ""} onChange={(e) => set("rental_start_date", e.target.value)} /></Field>
                      <Field label="Rental end"><Input type="date" value={form.rental_end_date || ""} onChange={(e) => set("rental_end_date", e.target.value)} /></Field>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="p-4 border-t bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSaveAll} disabled={saveMutation.isPending || isLoading}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save all changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

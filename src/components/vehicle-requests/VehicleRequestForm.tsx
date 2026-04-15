import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Car, Route } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface VehicleRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POOL_HIERARCHY: Record<string, string[]> = {
  corporate: ["FAN", "TPO", "HQ"],
  zone: ["SWAAZ", "EAAZ"],
  region: ["NR", "SR"],
};

const VEHICLE_TYPES = [
  "Sedan", "SUV", "Pickup", "Van", "Minibus", "Bus", "Truck", "Land Cruiser", "Double Cab",
];

const initialForm = {
  request_type: "daily_operation",
  date: "",
  start_time_h: "",
  start_time_m: "",
  end_time_h: "",
  end_time_m: "",
  start_date: "",
  end_date: "",
  departure_place: "",
  destination: "",
  num_vehicles: "1",
  passengers: "1",
  vehicle_type: "",
  trip_type: "",
  pool_category: "",
  pool_name: "",
  purpose: "",
};

export const VehicleRequestForm = ({ open, onOpenChange }: VehicleRequestFormProps) => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);

  const { data: pools = [] } = useQuery({
    queryKey: ["fleet-pools", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fleet_pools")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const filteredPools = useMemo(() => {
    if (!form.pool_category) return [];
    // Use DB pools if available, otherwise fallback to hardcoded
    const dbPools = pools.filter((p: any) => p.category === form.pool_category);
    if (dbPools.length > 0) return dbPools.map((p: any) => p.name);
    return POOL_HIERARCHY[form.pool_category] || [];
  }, [form.pool_category, pools]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

  const createMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const profile = (await supabase.from("profiles").select("full_name").eq("id", user!.id).single()).data;

      let neededFrom: string;
      let neededUntil: string | null = null;

      if (form.request_type === "daily_operation") {
        neededFrom = `${form.date}T${form.start_time_h || "08"}:${form.start_time_m || "00"}:00`;
        if (form.end_time_h) {
          neededUntil = `${form.date}T${form.end_time_h}:${form.end_time_m || "00"}:00`;
        }
      } else {
        neededFrom = `${form.start_date}T08:00:00`;
        neededUntil = form.end_date ? `${form.end_date}T18:00:00` : null;
      }

      const payload = {
        organization_id: organizationId!,
        request_number: `VR-${Date.now().toString(36).toUpperCase()}`,
        requester_id: user!.id,
        requester_name: profile?.full_name || user!.email || "Unknown",
        request_type: form.request_type,
        purpose: form.purpose,
        needed_from: neededFrom,
        needed_until: neededUntil,
        departure_place: form.departure_place || null,
        destination: form.destination || null,
        num_vehicles: parseInt(form.num_vehicles) || 1,
        passengers: parseInt(form.passengers) || 1,
        vehicle_type: form.vehicle_type || null,
        trip_type: form.trip_type || null,
        pool_category: form.pool_category || null,
        pool_name: form.pool_name || null,
        start_time: form.start_time_h ? `${form.start_time_h}:${form.start_time_m || "00"}` : null,
        end_time: form.end_time_h ? `${form.end_time_h}:${form.end_time_m || "00"}` : null,
        status: "pending",
      };

      const { data, error } = await (supabase as any).from("vehicle_requests").insert(payload).select("id").single();
      if (error) throw error;

      // Route approval
      const { error: routeErr } = await supabase.rpc("route_vehicle_request_approval", { p_request_id: data.id });
      if (routeErr) console.error("Approval routing error:", routeErr);

      return data;
    },
    onSuccess: () => {
      toast.success("Vehicle request submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      onOpenChange(false);
      setForm(initialForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isDaily = form.request_type === "daily_operation";
  const isProject = form.request_type === "project_operation";
  const isField = form.request_type === "field_operation";

  const canSubmit = form.purpose && (isDaily ? form.date : form.start_date);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Fleet Request Form
          </DialogTitle>
          <DialogDescription>Submit a vehicle request. Fields adapt based on operation type.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Vehicle Request Type */}
          <div>
            <Label className="text-primary font-medium">Vehicle Request Type</Label>
            <Select value={form.request_type} onValueChange={v => set("request_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily_operation">Daily Operation</SelectItem>
                <SelectItem value="project_operation">Project Operation</SelectItem>
                <SelectItem value="field_operation">Field Operation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date/Time Section - varies by type */}
          {isDaily ? (
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2">
                <Label className="text-primary font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date</Label>
                <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
              </div>
              <div>
                <Label className="text-primary font-medium flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Start Time</Label>
                <div className="flex gap-1">
                  <Select value={form.start_time_h} onValueChange={v => set("start_time_h", v)}>
                    <SelectTrigger className="w-16"><SelectValue placeholder="HH" /></SelectTrigger>
                    <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.start_time_m} onValueChange={v => set("start_time_m", v)}>
                    <SelectTrigger className="w-16"><SelectValue placeholder="MM" /></SelectTrigger>
                    <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="col-span-2">
                <Label className="text-primary font-medium">End Time</Label>
                <div className="flex gap-1">
                  <Select value={form.end_time_h} onValueChange={v => set("end_time_h", v)}>
                    <SelectTrigger className="w-16"><SelectValue placeholder="HH" /></SelectTrigger>
                    <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.end_time_m} onValueChange={v => set("end_time_m", v)}>
                    <SelectTrigger className="w-16"><SelectValue placeholder="MM" /></SelectTrigger>
                    <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-primary font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
              </div>
              <div>
                <Label className="text-primary font-medium">End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} />
              </div>
            </div>
          )}

          {/* Departure & Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Departure Place</Label>
              <Input
                value={form.departure_place}
                onChange={e => set("departure_place", e.target.value)}
                placeholder="Select Departure"
              />
            </div>
            <div>
              <Label className="text-primary font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Destination Place</Label>
              <Input
                value={form.destination}
                onChange={e => set("destination", e.target.value)}
                placeholder="Search Destination..."
              />
            </div>
          </div>

          {/* Vehicles & Passengers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium flex items-center gap-1"><Car className="w-3.5 h-3.5" /> No. Of Vehicle</Label>
              <Input type="number" min={1} value={form.num_vehicles} onChange={e => set("num_vehicles", e.target.value)} />
            </div>
            <div>
              <Label className="text-primary font-medium flex items-center gap-1"><Users className="w-3.5 h-3.5" /> No. Of Passenger</Label>
              <Input type="number" min={1} value={form.passengers} onChange={e => set("passengers", e.target.value)} />
            </div>
          </div>

          {/* Vehicle Type & Trip Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium">Vehicle Type</Label>
              <Select value={form.vehicle_type} onValueChange={v => set("vehicle_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map(vt => <SelectItem key={vt} value={vt}>{vt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-primary font-medium flex items-center gap-1"><Route className="w-3.5 h-3.5" /> Trip Type</Label>
              <Select value={form.trip_type} onValueChange={v => set("trip_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select Trip Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_way">One Way Trip</SelectItem>
                  <SelectItem value="round_trip">Round Trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pool Category & Pool Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium">Pool Category</Label>
              <Select value={form.pool_category} onValueChange={v => { set("pool_category", v); set("pool_name", ""); }}>
                <SelectTrigger><SelectValue placeholder="Select Pool Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="zone">Zone</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-primary font-medium">Pool</Label>
              <Select value={form.pool_name} onValueChange={v => set("pool_name", v)} disabled={!form.pool_category}>
                <SelectTrigger><SelectValue placeholder="Select Pool" /></SelectTrigger>
                <SelectContent>
                  {filteredPools.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trip Description */}
          <div>
            <Label className="text-primary font-medium">Trip Description</Label>
            <Textarea
              value={form.purpose}
              onChange={e => set("purpose", e.target.value)}
              placeholder="Description"
              rows={3}
            />
          </div>

          {/* Approval Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Approval Routing:</p>
            <p>• Requests ≤15 days → Routed to your Immediate Manager</p>
            <p>• Requests &gt;15 days → Routed to Director</p>
            <p>• Managers & above → Auto-approved</p>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={() => { setForm(initialForm); }}>Clear</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createMutation.isPending ? "Submitting..." : "Create Request"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

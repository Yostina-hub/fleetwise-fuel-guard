import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarCheck } from "lucide-react";
import { useOutsourceVehicleAttendance } from "@/hooks/useOutsourceVehicleAttendance";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useQuery } from "@tanstack/react-query";

export function AttendanceTab() {
  const { organizationId } = useOrganization();
  const { records, isLoading, upsert } = useOutsourceVehicleAttendance();

  const { data: rentals = [] } = useQuery({
    queryKey: ["rental-vehicles", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase.from("rental_vehicles").select("id,plate_number,provider_name").eq("organization_id", organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    rental_vehicle_id: "",
    attendance_date: new Date().toISOString().split("T")[0],
    status: "present" as const,
    km_driven: 0,
    hours_active: 0,
    fuel_consumed_liters: 0,
    notes: "",
  });

  const save = () => {
    if (!form.rental_vehicle_id) return;
    upsert.mutate(form as any, { onSuccess: () => setOpen(false) });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-primary" /> Vehicle Attendance (Rental / Outsourced)</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Record attendance</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record vehicle attendance</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Rental vehicle</Label>
                <Select value={form.rental_vehicle_id} onValueChange={(v) => setForm({ ...form, rental_vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {rentals.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.plate_number} — {r.provider_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.attendance_date} onChange={(e) => setForm({ ...form, attendance_date: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["present","absent","partial","maintenance"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>KM driven</Label><Input type="number" value={form.km_driven} onChange={(e) => setForm({ ...form, km_driven: Number(e.target.value) })} /></div>
              <div><Label>Hours active</Label><Input type="number" value={form.hours_active} onChange={(e) => setForm({ ...form, hours_active: Number(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Fuel consumed (L)</Label><Input type="number" value={form.fuel_consumed_liters} onChange={(e) => setForm({ ...form, fuel_consumed_liters: Number(e.target.value) })} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p> :
         records.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No attendance records yet.</p> :
        (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Vehicle</TableHead><TableHead>Status</TableHead>
              <TableHead>KM</TableHead><TableHead>Hours</TableHead><TableHead>Fuel (L)</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
            <TableBody>
              {records.map(r => {
                const v = rentals.find((x: any) => x.id === r.rental_vehicle_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.attendance_date}</TableCell>
                    <TableCell>{v ? `${v.plate_number}` : "—"}</TableCell>
                    <TableCell><Badge variant={r.status === "present" ? "default" : r.status === "absent" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                    <TableCell>{r.km_driven}</TableCell>
                    <TableCell>{r.hours_active}</TableCell>
                    <TableCell>{r.fuel_consumed_liters}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.source}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

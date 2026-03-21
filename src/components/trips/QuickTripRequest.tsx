import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripRequests } from "@/hooks/useTripRequests";
import { 
  Zap, MapPin, Clock, Users, ChevronDown, ChevronUp, Package, Sparkles 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export const QuickTripRequest = () => {
  const { createRequest, submitRequest } = useTripRequests();
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    purpose: "",
    pickup_at: "",
    return_at: "",
    pickup_geofence_id: "",
    drop_geofence_id: "",
    passengers: 1,
    required_class: "",
    notes: "",
    cargo_weight_kg: 0,
  });

  const { data: geofences } = useQuery({
    queryKey: ["geofences-quick"],
    queryFn: async () => {
      const { data } = await supabase
        .from("geofences")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
        .limit(50);
      return data || [];
    },
  });

  const handleQuickSubmit = async () => {
    if (!form.purpose || !form.pickup_at || !form.return_at) return;
    setSubmitting(true);
    try {
      const result = await createRequest.mutateAsync({
        purpose: form.purpose,
        pickup_at: form.pickup_at,
        return_at: form.return_at,
        pickup_geofence_id: form.pickup_geofence_id || null,
        drop_geofence_id: form.drop_geofence_id || null,
        passengers: form.passengers,
        required_class: form.required_class || null,
        notes: form.notes || null,
        cargo_weight_kg: form.cargo_weight_kg || null,
      });
      // Auto-submit for approval
      if (result?.id) {
        await submitRequest.mutateAsync(result.id);
      }
      setForm({
        purpose: "", pickup_at: "", return_at: "", pickup_geofence_id: "",
        drop_geofence_id: "", passengers: 1, required_class: "", notes: "",
        cargo_weight_kg: 0,
      });
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDraftSave = async () => {
    if (!form.purpose || !form.pickup_at || !form.return_at) return;
    setSubmitting(true);
    try {
      await createRequest.mutateAsync({
        purpose: form.purpose,
        pickup_at: form.pickup_at,
        return_at: form.return_at,
        pickup_geofence_id: form.pickup_geofence_id || null,
        drop_geofence_id: form.drop_geofence_id || null,
        passengers: form.passengers,
        required_class: form.required_class || null,
        notes: form.notes || null,
        cargo_weight_kg: form.cargo_weight_kg || null,
      });
      setForm({
        purpose: "", pickup_at: "", return_at: "", pickup_geofence_id: "",
        drop_geofence_id: "", passengers: 1, required_class: "", notes: "",
        cargo_weight_kg: 0,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5">
      <CardContent className="p-4">
        {/* Inline quick form */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Quick Trip Request</span>
          <span className="text-[10px] text-muted-foreground ml-1">One-click submit</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Purpose *</Label>
            <Input
              placeholder="e.g. Client meeting downtown"
              value={form.purpose}
              onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pickup *
            </Label>
            <Input
              type="datetime-local"
              value={form.pickup_at}
              onChange={(e) => setForm(f => ({ ...f, pickup_at: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Return *
            </Label>
            <Input
              type="datetime-local"
              value={form.return_at}
              onChange={(e) => setForm(f => ({ ...f, return_at: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Expandable details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Pickup Location
                  </Label>
                  <Select value={form.pickup_geofence_id} onValueChange={(v) => setForm(f => ({ ...f, pickup_geofence_id: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {geofences?.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Drop Location
                  </Label>
                  <Select value={form.drop_geofence_id} onValueChange={(v) => setForm(f => ({ ...f, drop_geofence_id: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {geofences?.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" /> Passengers
                  </Label>
                  <Input
                    type="number" min={1} max={50}
                    value={form.passengers}
                    onChange={(e) => setForm(f => ({ ...f, passengers: parseInt(e.target.value) || 1 }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vehicle Type</Label>
                  <Select value={form.required_class} onValueChange={(v) => setForm(f => ({ ...f, required_class: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedan">Sedan</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="bus">Bus</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Special instructions..."
                    className="h-9 min-h-[36px] text-sm resize-none"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" /> Cargo (kg)
                  </Label>
                  <Input
                    type="number" min={0}
                    value={form.cargo_weight_kg || ""}
                    onChange={(e) => setForm(f => ({ ...f, cargo_weight_kg: parseFloat(e.target.value) || 0 }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            onClick={handleQuickSubmit}
            disabled={!form.purpose || !form.pickup_at || !form.return_at || submitting}
            className="gap-1.5 h-8 text-xs font-semibold"
            size="sm"
          >
            <Zap className="w-3.5 h-3.5" />
            {submitting ? "Submitting..." : "Create & Submit"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDraftSave}
            disabled={!form.purpose || !form.pickup_at || !form.return_at || submitting}
            className="h-8 text-xs"
            size="sm"
          >
            Save as Draft
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="ml-auto h-8 text-xs gap-1 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Less" : "More Options"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

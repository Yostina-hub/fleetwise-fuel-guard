import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Nfc, Plus, Search, Link2, Link2Off, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const RFIDPairing = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showPairDialog, setShowPairDialog] = useState(false);
  const [pairData, setPairData] = useState({ device_id: "", driver_id: "", rfid_tag: "" });

  const { data: devices = [] } = useQuery({
    queryKey: ["devices", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("devices").select("id, imei, tracker_model, vehicle_id").eq("organization_id", organizationId);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("drivers").select("id, first_name, last_name, rfid_tag").eq("organization_id", organizationId);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: pairings = [], isLoading } = useQuery({
    queryKey: ["rfid-pairings", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("rfid_pairings")
        .select("*")
        .eq("organization_id", organizationId)
        .order("paired_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createPairingMutation = useMutation({
    mutationFn: async (payload: typeof pairData) => {
      if (!organizationId) throw new Error("No org");
      // Deactivate existing pairing for this device
      await supabase.from("rfid_pairings")
        .update({ is_active: false, unpaired_at: new Date().toISOString() })
        .eq("device_id", payload.device_id)
        .eq("is_active", true)
        .eq("organization_id", organizationId);

      const { error } = await supabase.from("rfid_pairings").insert({
        organization_id: organizationId,
        device_id: payload.device_id,
        driver_id: payload.driver_id,
        rfid_tag: payload.rfid_tag,
      });
      if (error) throw error;

      // Also update driver's rfid_tag field
      await supabase.from("drivers").update({ rfid_tag: payload.rfid_tag }).eq("id", payload.driver_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfid-pairings"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setShowPairDialog(false);
      setPairData({ device_id: "", driver_id: "", rfid_tag: "" });
      toast.success("RFID tag paired successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unpairMutation = useMutation({
    mutationFn: async (pairingId: string) => {
      const { error } = await supabase.from("rfid_pairings")
        .update({ is_active: false, unpaired_at: new Date().toISOString() })
        .eq("id", pairingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfid-pairings"] });
      toast.success("RFID tag unpaired");
    },
  });

  const getDeviceLabel = (id: string) => {
    const d = devices.find(dev => dev.id === id);
    return d ? `${d.tracker_model} (${d.imei})` : "Unknown";
  };

  const getDriverName = (id: string) => {
    const d = drivers.find(dr => dr.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "Unknown";
  };

  const filteredPairings = useMemo(() => {
    if (!search) return pairings;
    const s = search.toLowerCase();
    return pairings.filter(p =>
      p.rfid_tag?.toLowerCase().includes(s) ||
      getDeviceLabel(p.device_id).toLowerCase().includes(s) ||
      getDriverName(p.driver_id).toLowerCase().includes(s)
    );
  }, [pairings, search, devices, drivers]);

  const activePairings = pairings.filter(p => p.is_active).length;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">RFID Driver Pairing</h1>
            <p className="text-muted-foreground text-sm">Pair RFID/iButton tags to devices and drivers for automatic identification</p>
          </div>
          <Button className="gap-2" onClick={() => setShowPairDialog(true)}>
            <Plus className="w-4 h-4" /> New Pairing
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Link2 className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Active Pairings</p>
                <p className="text-2xl font-bold">{activePairings}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><Nfc className="w-5 h-5 text-foreground" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pairings</p>
                <p className="text-2xl font-bold">{pairings.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Link2Off className="w-5 h-5 text-warning" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{pairings.length - activePairings}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by tag, device, driver..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Card>
            <CardHeader><CardTitle>Pairing History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFID Tag</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Paired At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPairings.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No pairings found</TableCell></TableRow>
                  ) : filteredPairings.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-semibold">{p.rfid_tag}</TableCell>
                      <TableCell>{getDeviceLabel(p.device_id)}</TableCell>
                      <TableCell>{getDriverName(p.driver_id)}</TableCell>
                      <TableCell className="text-sm">{format(new Date(p.paired_at), "dd MMM yyyy, HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.is_active && (
                          <Button variant="ghost" size="sm" onClick={() => unpairMutation.mutate(p.id)}>
                            <Link2Off className="w-4 h-4 mr-1" /> Unpair
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pair Dialog */}
        <Dialog open={showPairDialog} onOpenChange={setShowPairDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Pair RFID Tag</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>RFID / iButton Tag</Label>
                <Input value={pairData.rfid_tag} onChange={e => setPairData(p => ({ ...p, rfid_tag: e.target.value }))} placeholder="Scan or enter tag ID" />
              </div>
              <div>
                <Label>Device</Label>
                <Select value={pairData.device_id} onValueChange={v => setPairData(p => ({ ...p, device_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
                  <SelectContent>
                    {devices.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.tracker_model} ({d.imei})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Driver</Label>
                <Select value={pairData.driver_id} onValueChange={v => setPairData(p => ({ ...p, driver_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPairDialog(false)}>Cancel</Button>
              <Button onClick={() => createPairingMutation.mutate(pairData)} disabled={!pairData.rfid_tag || !pairData.device_id || !pairData.driver_id}>
                Pair Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RFIDPairing;

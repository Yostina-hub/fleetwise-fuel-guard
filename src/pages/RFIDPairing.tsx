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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Nfc, Plus, Search, Link2, Link2Off, Loader2, Trash2, Edit, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from 'react-i18next';

const RFIDPairing = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showPairDialog, setShowPairDialog] = useState(false);
  const [editingPairing, setEditingPairing] = useState<any>(null);
  const [showNotesDialog, setShowNotesDialog] = useState<any>(null);
  const [notesText, setNotesText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [pairData, setPairData] = useState({ device_id: "", driver_id: "", rfid_tag: "", notes: "" });

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["rfid-pairings"] });
    queryClient.invalidateQueries({ queryKey: ["drivers"] });
  };

  const createPairingMutation = useMutation({
    mutationFn: async (payload: typeof pairData) => {
      if (!organizationId) throw new Error("No org");
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
        notes: payload.notes || null,
      });
      if (error) throw error;
      await supabase.from("drivers").update({ rfid_tag: payload.rfid_tag }).eq("id", payload.driver_id);
    },
    onSuccess: () => {
      invalidate();
      setShowPairDialog(false);
      setPairData({ device_id: "", driver_id: "", rfid_tag: "", notes: "" });
      toast.success("RFID tag paired successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePairingMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; rfid_tag: string; device_id: string; driver_id: string; notes: string }) => {
      const { error } = await supabase.from("rfid_pairings")
        .update({ rfid_tag: payload.rfid_tag, device_id: payload.device_id, driver_id: payload.driver_id, notes: payload.notes || null })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("drivers").update({ rfid_tag: payload.rfid_tag }).eq("id", payload.driver_id);
    },
    onSuccess: () => {
      invalidate();
      setEditingPairing(null);
      toast.success("Pairing updated");
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
    onSuccess: () => { invalidate(); toast.success("RFID tag unpaired"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rfid_pairings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setShowDeleteConfirm(null); toast.success("Pairing deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("rfid_pairings").update({ notes: notes || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setShowNotesDialog(null); toast.success("Notes saved"); },
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

  const openEdit = (p: any) => {
    setEditingPairing(p);
    setPairData({ device_id: p.device_id, driver_id: p.driver_id, rfid_tag: p.rfid_tag, notes: p.notes || "" });
  };

  const handleSave = () => {
    if (editingPairing) {
      updatePairingMutation.mutate({ id: editingPairing.id, ...pairData });
    } else {
      createPairingMutation.mutate(pairData);
    }
  };

  const closeDialog = () => {
    setShowPairDialog(false);
    setEditingPairing(null);
    setPairData({ device_id: "", driver_id: "", rfid_tag: "", notes: "" });
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('pages.r_f_i_d_pairing.title', 'RFID Driver Pairing')}</h1>
            <p className="text-muted-foreground text-sm">{t('pages.r_f_i_d_pairing.description', 'Pair RFID/iButton tags to devices and drivers for automatic identification')}</p>
          </div>
          <Button className="gap-2" onClick={() => { setPairData({ device_id: "", driver_id: "", rfid_tag: "", notes: "" }); setEditingPairing(null); setShowPairDialog(true); }}>
            <Plus className="w-4 h-4" /> New Pairing
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Link2 className="w-5 h-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Active Pairings</p><p className="text-2xl font-bold">{activePairings}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><Nfc className="w-5 h-5 text-foreground" /></div>
            <div><p className="text-sm text-muted-foreground">Total Pairings</p><p className="text-2xl font-bold">{pairings.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><Link2Off className="w-5 h-5 text-warning" /></div>
            <div><p className="text-sm text-muted-foreground">Inactive</p><p className="text-2xl font-bold">{pairings.length - activePairings}</p></div>
          </CardContent></Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by tag, device, driver..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

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
                    <TableHead>{t('devices.device', 'Device')}</TableHead>
                    <TableHead>{t('common.driver', 'Driver')}</TableHead>
                    <TableHead>Paired At</TableHead>
                    <TableHead>{t('common.status', 'Status')}</TableHead>
                    <TableHead>{t('common.actions', 'Actions')}</TableHead>
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
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setShowNotesDialog(p); setNotesText(p.notes || ""); }} title="Notes">
                            <StickyNote className="w-4 h-4" />
                          </Button>
                          {p.is_active && (
                            <Button variant="ghost" size="sm" onClick={() => unpairMutation.mutate(p.id)} title="Unpair">
                              <Link2Off className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(p.id)} className="text-destructive hover:text-destructive" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={showPairDialog || !!editingPairing} onOpenChange={v => { if (!v) closeDialog(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPairing ? "Edit Pairing" : "Pair RFID Tag"}</DialogTitle>
              <DialogDescription>{editingPairing ? "Update the RFID pairing details." : "Create a new RFID pairing."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>RFID / iButton Tag</Label>
                <Input value={pairData.rfid_tag} onChange={e => setPairData(p => ({ ...p, rfid_tag: e.target.value }))} placeholder="Scan or enter tag ID" />
              </div>
              <div>
                <Label>{t('devices.device', 'Device')}</Label>
                <Select value={pairData.device_id || undefined} onValueChange={v => setPairData(p => ({ ...p, device_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
                  <SelectContent>
                    {devices.filter(d => d.id).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.tracker_model} ({d.imei})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('common.driver', 'Driver')}</Label>
                <Select value={pairData.driver_id || undefined} onValueChange={v => setPairData(p => ({ ...p, driver_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.id).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={pairData.notes} onChange={e => setPairData(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>{t('common.cancel', 'Cancel')}</Button>
              <Button onClick={handleSave} disabled={!pairData.rfid_tag || !pairData.device_id || !pairData.driver_id}>
                {editingPairing ? "Update" : "Pair Tag"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notes Dialog */}
        <Dialog open={!!showNotesDialog} onOpenChange={v => { if (!v) setShowNotesDialog(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pairing Notes</DialogTitle>
              <DialogDescription>View or update notes for tag {showNotesDialog?.rfid_tag}</DialogDescription>
            </DialogHeader>
            <Textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={4} placeholder="Add notes..." />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNotesDialog(null)}>Cancel</Button>
              <Button onClick={() => updateNotesMutation.mutate({ id: showNotesDialog.id, notes: notesText })}>Save Notes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!showDeleteConfirm} onOpenChange={v => { if (!v) setShowDeleteConfirm(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Pairing</DialogTitle>
              <DialogDescription>This will permanently remove this pairing record. Continue?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => showDeleteConfirm && deleteMutation.mutate(showDeleteConfirm)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RFIDPairing;

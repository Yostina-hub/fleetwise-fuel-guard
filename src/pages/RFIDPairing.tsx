import { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
import { Nfc, Plus, Search, Link2, Link2Off, Loader2, Trash2, Edit, StickyNote, Scan, Keyboard, Radio } from "lucide-react";
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
  const [tagInputMode, setTagInputMode] = useState<"scan" | "manual">("scan");
  const [scanActive, setScanActive] = useState(false);
  const [pairData, setPairData] = useState({ device_id: "", driver_id: "", rfid_tag: "", notes: "" });
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef("");
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scanner detection: RFID scanners type fast like a keyboard, then send Enter
  const handleScanKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (tagInputMode !== "scan") return;

    if (e.key === "Enter" && scanBufferRef.current.length >= 4) {
      e.preventDefault();
      const tag = scanBufferRef.current.trim();
      setPairData(p => ({ ...p, rfid_tag: tag }));
      scanBufferRef.current = "";
      setScanActive(false);
      toast.success(`Tag scanned: ${tag}`);
      return;
    }

    // Detect rapid sequential input (scanner behavior)
    if (e.key.length === 1) {
      setScanActive(true);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      scanTimerRef.current = setTimeout(() => {
        setScanActive(false);
      }, 500);
    }
  }, [tagInputMode]);

  // Auto-focus scan input when dialog opens in scan mode
  useEffect(() => {
    if ((showPairDialog || editingPairing) && tagInputMode === "scan") {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [showPairDialog, editingPairing, tagInputMode]);

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
      const tag = payload.rfid_tag.trim();
      if (tag.length < 4 || tag.length > 64) throw new Error("Tag ID must be 4–64 characters");

      await supabase.from("rfid_pairings")
        .update({ is_active: false, unpaired_at: new Date().toISOString() })
        .eq("device_id", payload.device_id)
        .eq("is_active", true)
        .eq("organization_id", organizationId);

      const { error } = await supabase.from("rfid_pairings").insert({
        organization_id: organizationId,
        device_id: payload.device_id,
        driver_id: payload.driver_id,
        rfid_tag: tag,
        notes: payload.notes?.trim() || null,
      });
      if (error) throw error;
      await supabase.from("drivers").update({ rfid_tag: tag }).eq("id", payload.driver_id);
    },
    onSuccess: () => {
      invalidate();
      closeDialog();
      toast.success("RFID tag paired successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePairingMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; rfid_tag: string; device_id: string; driver_id: string; notes: string }) => {
      const tag = payload.rfid_tag.trim();
      if (tag.length < 4 || tag.length > 64) throw new Error("Tag ID must be 4–64 characters");
      const { error } = await supabase.from("rfid_pairings")
        .update({ rfid_tag: tag, device_id: payload.device_id, driver_id: payload.driver_id, notes: payload.notes?.trim() || null })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("drivers").update({ rfid_tag: tag }).eq("id", payload.driver_id);
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
    onSuccess: () => { invalidate(); setShowDeleteConfirm(null); toast.success("Pairing record deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("rfid_pairings").update({ notes: notes?.trim() || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setShowNotesDialog(null); toast.success("Notes saved"); },
  });

  const getDeviceLabel = (id: string) => {
    const d = devices.find(dev => dev.id === id);
    return d ? `${d.tracker_model} (${d.imei})` : "Unknown Device";
  };

  const getDriverName = (id: string) => {
    const d = drivers.find(dr => dr.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "Unknown Driver";
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
    setTagInputMode("manual");
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
    setScanActive(false);
    scanBufferRef.current = "";
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Nfc className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('pages.r_f_i_d_pairing.title', 'RFID Driver Pairing')}</h1>
              <p className="text-muted-foreground text-sm">{t('pages.r_f_i_d_pairing.description', 'Pair RFID/iButton tags to devices and drivers for automatic identification')}</p>
            </div>
          </div>
          <Button className="gap-2" onClick={() => { setPairData({ device_id: "", driver_id: "", rfid_tag: "", notes: "" }); setEditingPairing(null); setTagInputMode("scan"); setShowPairDialog(true); }}>
            <Plus className="w-4 h-4" /> New Pairing
          </Button>
        </div>

        {/* KPIs */}
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
            <div className="p-2 rounded-lg bg-destructive/10"><Link2Off className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-sm text-muted-foreground">Inactive</p><p className="text-2xl font-bold">{pairings.length - activePairings}</p></div>
          </CardContent></Card>
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
            <CardHeader><CardTitle className="text-lg">Pairing History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFID Tag</TableHead>
                    <TableHead>{t('devices.device', 'Device')}</TableHead>
                    <TableHead>{t('common.driver', 'Driver')}</TableHead>
                    <TableHead>Paired At</TableHead>
                    <TableHead>{t('common.status', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPairings.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <Nfc className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p>No pairings found</p>
                      <p className="text-xs mt-1">Create a new pairing to get started</p>
                    </TableCell></TableRow>
                  ) : filteredPairings.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                          <code className="font-mono text-sm font-semibold bg-muted px-2 py-0.5 rounded">{p.rfid_tag}</code>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{getDeviceLabel(p.device_id)}</TableCell>
                      <TableCell className="text-sm">{getDriverName(p.driver_id)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(p.paired_at), "dd MMM yyyy, HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} title="Edit">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowNotesDialog(p); setNotesText(p.notes || ""); }} title="Notes">
                            <StickyNote className="w-3.5 h-3.5" />
                          </Button>
                          {p.is_active && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => unpairMutation.mutate(p.id)} title="Unpair">
                              <Link2Off className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(p.id)} title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Nfc className="w-5 h-5 text-primary" />
                {editingPairing ? "Edit Pairing" : "New RFID Pairing"}
              </DialogTitle>
              <DialogDescription>
                {editingPairing ? "Update the RFID pairing details." : "Scan an RFID tag or enter it manually, then assign a device and driver."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Tag Input Mode Toggle */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">RFID / iButton Tag</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={tagInputMode === "scan" ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5 flex-1"
                    onClick={() => { setTagInputMode("scan"); setTimeout(() => scanInputRef.current?.focus(), 50); }}
                  >
                    <Scan className="w-3.5 h-3.5" /> Scan Tag
                  </Button>
                  <Button
                    type="button"
                    variant={tagInputMode === "manual" ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5 flex-1"
                    onClick={() => setTagInputMode("manual")}
                  >
                    <Keyboard className="w-3.5 h-3.5" /> Enter Manually
                  </Button>
                </div>

                {tagInputMode === "scan" ? (
                  <div className="relative">
                    <div className={`rounded-lg border-2 border-dashed p-6 text-center transition-all ${
                      pairData.rfid_tag
                        ? "border-primary bg-primary/5"
                        : scanActive
                        ? "border-primary/60 bg-primary/5 animate-pulse"
                        : "border-muted-foreground/20 bg-muted/30"
                    }`}>
                      <div className="flex flex-col items-center gap-2">
                        <Radio className={`w-8 h-8 ${
                          pairData.rfid_tag ? "text-primary" : scanActive ? "text-primary animate-pulse" : "text-muted-foreground/40"
                        }`} />
                        {pairData.rfid_tag ? (
                          <>
                            <code className="font-mono text-lg font-bold text-foreground bg-muted px-3 py-1 rounded">{pairData.rfid_tag}</code>
                            <p className="text-xs text-muted-foreground">Tag captured — scan again to replace</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-muted-foreground">
                              {scanActive ? "Reading tag..." : "Hold RFID tag near scanner"}
                            </p>
                            <p className="text-xs text-muted-foreground">The tag ID will appear automatically</p>
                          </>
                        )}
                      </div>
                      {/* Hidden input captures scanner keyboard output */}
                      <input
                        ref={scanInputRef}
                        className="absolute inset-0 opacity-0 cursor-default"
                        value={scanBufferRef.current}
                        onChange={e => { scanBufferRef.current = e.target.value; }}
                        onKeyDown={handleScanKeyDown}
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                  </div>
                ) : (
                  <Input
                    value={pairData.rfid_tag}
                    onChange={e => setPairData(p => ({ ...p, rfid_tag: e.target.value }))}
                    placeholder="Enter tag ID (e.g. 0A1B2C3D)"
                    className="font-mono"
                    maxLength={64}
                    autoFocus
                  />
                )}
                {pairData.rfid_tag && (
                  <p className="text-xs text-muted-foreground">Tag: <code className="font-mono">{pairData.rfid_tag}</code> ({pairData.rfid_tag.length} chars)</p>
                )}
              </div>

              {/* Device Selection */}
              <div className="space-y-2">
                <Label>{t('devices.device', 'Device')}</Label>
                <Select value={pairData.device_id || undefined} onValueChange={v => setPairData(p => ({ ...p, device_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a tracking device" /></SelectTrigger>
                  <SelectContent>
                    {devices.filter(d => d.id).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.tracker_model} ({d.imei})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Driver Selection */}
              <div className="space-y-2">
                <Label>{t('common.driver', 'Driver')}</Label>
                <Select value={pairData.driver_id || undefined} onValueChange={v => setPairData(p => ({ ...p, driver_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.id).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  value={pairData.notes}
                  onChange={e => setPairData(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Add any notes about this pairing"
                  rows={2}
                  maxLength={500}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>{t('common.cancel', 'Cancel')}</Button>
              <Button
                onClick={handleSave}
                disabled={!pairData.rfid_tag?.trim() || pairData.rfid_tag.trim().length < 4 || !pairData.device_id || !pairData.driver_id || createPairingMutation.isPending || updatePairingMutation.isPending}
                className="gap-2"
              >
                {(createPairingMutation.isPending || updatePairingMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingPairing ? "Update Pairing" : "Pair Tag"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notes Dialog */}
        <Dialog open={!!showNotesDialog} onOpenChange={v => { if (!v) setShowNotesDialog(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pairing Notes</DialogTitle>
              <DialogDescription>Notes for tag <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{showNotesDialog?.rfid_tag}</code></DialogDescription>
            </DialogHeader>
            <Textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={4} placeholder="Add notes..." maxLength={500} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNotesDialog(null)}>Cancel</Button>
              <Button onClick={() => updateNotesMutation.mutate({ id: showNotesDialog.id, notes: notesText })} disabled={updateNotesMutation.isPending}>
                {updateNotesMutation.isPending ? "Saving..." : "Save Notes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!showDeleteConfirm} onOpenChange={v => { if (!v) setShowDeleteConfirm(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Pairing</DialogTitle>
              <DialogDescription>This will permanently remove this pairing record. This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => showDeleteConfirm && deleteMutation.mutate(showDeleteConfirm)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RFIDPairing;

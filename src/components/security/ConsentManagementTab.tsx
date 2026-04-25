import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, XCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { friendlyToastError } from "@/lib/errorMessages";

const CONSENT_TYPES = [
  { value: "gps_tracking", label: "GPS Tracking" },
  { value: "data_processing", label: "Data Processing" },
  { value: "communications", label: "Communications" },
  { value: "data_sharing", label: "Data Sharing" },
  { value: "biometric", label: "Biometric Data" },
  { value: "video_recording", label: "Video Recording" },
];

const ConsentManagementTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [consentType, setConsentType] = useState("gps_tracking");
  const [consentText, setConsentText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const { data: records, isLoading } = useQuery({
    queryKey: ["consent-records", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("consent_records")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(records?.length || 0, 10);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("consent_records").insert([{
        organization_id: organizationId,
        consent_type: consentType,
        consent_given: true,
        consent_text: consentText || null,
        given_at: new Date().toISOString(),
        collected_by: user.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-records"] });
      setIsDialogOpen(false);
      setConsentText("");
      toast({ title: "Consent Recorded", description: "Consent record has been created" });
    },
    onError: () => {
      friendlyToastError(null, { title: "Failed to record consent" });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("consent_records").update({
        consent_given: false,
        withdrawn_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-records"] });
      toast({ title: "Consent Withdrawn" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Consent Management (Art. 7)</h2>
          <p className="text-sm text-muted-foreground">Track and manage driver/user consent records</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Record Consent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record New Consent</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Consent Type</Label>
                <Select value={consentType} onValueChange={setConsentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONSENT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Consent Text / Notes</Label>
                <Textarea value={consentText} onChange={e => setConsentText(e.target.value)} placeholder="Consent language shown to subject..." />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Saving..." : "Record Consent"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Given At</TableHead>
                <TableHead>Withdrawn At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records?.slice(startIndex, endIndex).map(r => (
                <TableRow key={r.id}>
                  <TableCell className="capitalize">{r.consent_type?.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <Badge variant={r.consent_given ? "default" : "destructive"}>
                      {r.consent_given ? "Active" : "Withdrawn"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.consent_version}</TableCell>
                  <TableCell>{r.given_at ? format(new Date(r.given_at), "PP") : "-"}</TableCell>
                  <TableCell>{r.withdrawn_at ? format(new Date(r.withdrawn_at), "PP") : "-"}</TableCell>
                  <TableCell>
                    {r.consent_given && (
                      <Button size="sm" variant="outline" onClick={() => withdrawMutation.mutate(r.id)}>
                        <XCircle className="h-4 w-4 mr-1" /> Withdraw
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination currentPage={currentPage} totalItems={records?.length || 0} itemsPerPage={10} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
};

export default ConsentManagementTab;

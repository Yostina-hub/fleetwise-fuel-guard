import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/hooks/useOrganization";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { friendlyToastError } from "@/lib/errorMessages";

const LAWFUL_BASES = [
  { value: "consent", label: "Consent" },
  { value: "contract", label: "Contract Performance" },
  { value: "legal_obligation", label: "Legal Obligation" },
  { value: "vital_interest", label: "Vital Interest" },
  { value: "public_interest", label: "Public Interest" },
  { value: "legitimate_interest", label: "Legitimate Interest" },
];

const ProcessingActivitiesTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lawfulBasis, setLawfulBasis] = useState("legitimate_interest");
  const [retention, setRetention] = useState("");
  const [securityMeasures, setSecurityMeasures] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["processing-activities", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("processing_activities")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(activities?.length || 0, 10);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Missing org");
      const { error } = await supabase.from("processing_activities").insert([{
        organization_id: organizationId,
        activity_name: activityName,
        purpose,
        lawful_basis: lawfulBasis,
        retention_period: retention || null,
        security_measures: securityMeasures || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processing-activities"] });
      setIsDialogOpen(false);
      setActivityName("");
      setPurpose("");
      setRetention("");
      setSecurityMeasures("");
      toast({ title: "Activity Registered", description: "Processing activity added to ROPA" });
    },
    onError: () => {
      friendlyToastError(null, { title: "Failed to create activity" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Processing Activities Register (Art. 30)</h2>
          <p className="text-sm text-muted-foreground">Record of Processing Activities (ROPA)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Activity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register Processing Activity</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Activity Name</Label>
                <Input value={activityName} onChange={e => setActivityName(e.target.value)} placeholder="e.g., Vehicle GPS Tracking" />
              </div>
              <div>
                <Label>Purpose</Label>
                <Textarea value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Why this data is processed..." />
              </div>
              <div>
                <Label>Lawful Basis</Label>
                <Select value={lawfulBasis} onValueChange={setLawfulBasis}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAWFUL_BASES.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Retention Period</Label>
                <Input value={retention} onChange={e => setRetention(e.target.value)} placeholder="e.g., 12 months" />
              </div>
              <div>
                <Label>Security Measures</Label>
                <Textarea value={securityMeasures} onChange={e => setSecurityMeasures(e.target.value)} placeholder="Encryption, RLS, access controls..." />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !activityName || !purpose} className="w-full">
                {createMutation.isPending ? "Saving..." : "Register Activity"}
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
                <TableHead>Activity</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Lawful Basis</TableHead>
                <TableHead>Retention</TableHead>
                <TableHead>DPIA</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities?.slice(startIndex, endIndex).map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.activity_name}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{a.purpose}</TableCell>
                  <TableCell><Badge variant="secondary">{a.lawful_basis?.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell>{a.retention_period || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={a.dpia_required ? (a.dpia_completed_at ? "default" : "destructive") : "outline"}>
                      {a.dpia_required ? (a.dpia_completed_at ? "Done" : "Required") : "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? "default" : "secondary"}>
                      {a.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination currentPage={currentPage} totalItems={activities?.length || 0} itemsPerPage={10} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
};

export default ProcessingActivitiesTab;

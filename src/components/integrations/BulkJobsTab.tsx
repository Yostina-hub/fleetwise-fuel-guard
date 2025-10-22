import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Upload } from "lucide-react";
import { format as formatDate } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

const ENTITY_TYPES = [
  "vehicles",
  "drivers",
  "trips",
  "fuel_transactions",
  "maintenance_records",
  "alerts",
];

const FORMATS = ["csv", "json", "xlsx"];

const BulkJobsTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [jobType, setJobType] = useState<"import" | "export">("export");
  const [entityType, setEntityType] = useState("");
  const [format, setFormat] = useState("csv");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["bulk-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user) throw new Error("Missing organization or user");
      
      const { error } = await supabase
        .from("bulk_jobs")
        .insert([{
          job_type: jobType,
          entity_type: entityType,
          format,
          organization_id: organizationId,
          created_by: user.id,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulk-jobs"] });
      setIsDialogOpen(false);
      setEntityType("");
      toast({
        title: "Job Created",
        description: `${jobType === "import" ? "Import" : "Export"} job has been queued`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "processing":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getProgress = (job: any) => {
    if (!job.total_records) return 0;
    return (job.processed_records / job.total_records) * 100;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Bulk Import/Export</h2>
          <p className="text-sm text-muted-foreground">
            Import or export large datasets in CSV, JSON, or Excel format
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Bulk Job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="jobType">Job Type</Label>
                <Select value={jobType} onValueChange={(v: any) => setJobType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="import">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Import
                      </div>
                    </SelectItem>
                    <SelectItem value="export">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="entityType">Entity Type</Label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="format">Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((formatOption) => (
                      <SelectItem key={formatOption} value={formatOption}>
                        {formatOption.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => createJobMutation.mutate()}
                disabled={!entityType || createJobMutation.isPending}
                className="w-full"
              >
                {createJobMutation.isPending ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs?.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="capitalize">
                  {job.job_type === "import" ? (
                    <Badge variant="secondary">
                      <Upload className="h-3 w-3 mr-1" />
                      Import
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="capitalize">
                  {job.entity_type.replace("_", " ")}
                </TableCell>
                <TableCell className="uppercase">{job.format}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(job.status)}>
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {job.total_records ? (
                    <div className="space-y-1">
                      <Progress value={getProgress(job)} className="w-24" />
                      <p className="text-xs text-muted-foreground">
                        {job.processed_records}/{job.total_records}
                      </p>
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                 <TableCell>
                   {formatDate(new Date(job.created_at), "PPpp")}
                 </TableCell>
                <TableCell>
                  {job.status === "completed" && job.file_url && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={job.file_url} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default BulkJobsTab;

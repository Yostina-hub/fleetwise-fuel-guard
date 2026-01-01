import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Upload,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Download,
  Loader2,
  Filter,
  Shield,
} from "lucide-react";
import { useDocuments, Document } from "@/hooks/useDocuments";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { format, differenceInDays, isPast } from "date-fns";

const documentTypes = [
  { value: "driver_license", label: "Driver License" },
  { value: "vehicle_registration", label: "Vehicle Registration" },
  { value: "insurance", label: "Insurance Certificate" },
  { value: "medical_certificate", label: "Medical Certificate" },
  { value: "inspection_report", label: "Inspection Report" },
  { value: "permit", label: "Operating Permit" },
  { value: "contract", label: "Lease/Contract" },
];

export default function DocumentsTab() {
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [filterDocType, setFilterDocType] = useState<string>("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    document_type: "",
    entity_type: "driver" as "driver" | "vehicle",
    entity_id: "",
    file_name: "",
    file_url: "",
    expiry_date: "",
    issue_date: "",
    document_number: "",
    notes: "",
  });

  const { documents, loading, createDocument, deleteDocument, verifyDocument, getExpiringDocuments, getExpiredDocuments } = useDocuments();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();

  const filteredDocuments = documents.filter((doc) => {
    if (filterEntityType !== "all" && doc.entity_type !== filterEntityType) return false;
    if (filterDocType !== "all" && doc.document_type !== filterDocType) return false;
    return true;
  });

  const expiringDocs = getExpiringDocuments();
  const expiredDocs = getExpiredDocuments();

  const getEntityName = (doc: Document) => {
    if (doc.entity_type === "driver") {
      const driver = drivers.find((d) => d.id === doc.entity_id);
      return driver ? `${driver.first_name} ${driver.last_name}` : "Unknown Driver";
    } else {
      const vehicle = vehicles.find((v) => v.id === doc.entity_id);
      return vehicle ? vehicle.plate_number : "Unknown Vehicle";
    }
  };

  const getExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = differenceInDays(expiry, new Date());

    if (isPast(expiry)) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Expired
        </Badge>
      );
    }
    if (daysUntilExpiry <= 30) {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
          <Clock className="w-3 h-3" />
          {daysUntilExpiry}d left
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <CheckCircle className="w-3 h-3" />
        Valid
      </Badge>
    );
  };

  const handleUpload = async () => {
    if (!uploadForm.document_type || !uploadForm.entity_id || !uploadForm.file_name) {
      return;
    }

    await createDocument({
      document_type: uploadForm.document_type,
      entity_type: uploadForm.entity_type,
      entity_id: uploadForm.entity_id,
      file_name: uploadForm.file_name,
      file_url: uploadForm.file_url || `https://example.com/docs/${uploadForm.file_name}`,
      expiry_date: uploadForm.expiry_date || undefined,
      issue_date: uploadForm.issue_date || undefined,
      document_number: uploadForm.document_number || undefined,
      notes: uploadForm.notes || undefined,
    });

    setShowUploadDialog(false);
    setUploadForm({
      document_type: "",
      entity_type: "driver",
      entity_id: "",
      file_name: "",
      file_url: "",
      expiry_date: "",
      issue_date: "",
      document_number: "",
      notes: "",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Cards */}
      {(expiredDocs.length > 0 || expiringDocs.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expiredDocs.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                  <div>
                    <p className="font-semibold text-destructive">{expiredDocs.length} Expired Documents</p>
                    <p className="text-sm text-muted-foreground">Require immediate attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {expiringDocs.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-warning" />
                  <div>
                    <p className="font-semibold text-warning">{expiringDocs.length} Expiring Soon</p>
                    <p className="text-sm text-muted-foreground">Within next 30 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3">
          <Select value={filterEntityType} onValueChange={setFilterEntityType}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="driver">Drivers</SelectItem>
              <SelectItem value="vehicle">Vehicles</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDocType} onValueChange={setFilterDocType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Documents</SelectItem>
              {documentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entity Type</Label>
                  <Select
                    value={uploadForm.entity_type}
                    onValueChange={(value: "driver" | "vehicle") =>
                      setUploadForm({ ...uploadForm, entity_type: value, entity_id: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{uploadForm.entity_type === "driver" ? "Driver" : "Vehicle"}</Label>
                  <Select
                    value={uploadForm.entity_id}
                    onValueChange={(value) => setUploadForm({ ...uploadForm, entity_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {uploadForm.entity_type === "driver"
                        ? drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.first_name} {driver.last_name}
                            </SelectItem>
                          ))
                        : vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.plate_number}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Document Type</Label>
                <Select
                  value={uploadForm.document_type}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, document_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>File Name</Label>
                <Input
                  value={uploadForm.file_name}
                  onChange={(e) => setUploadForm({ ...uploadForm, file_name: e.target.value })}
                  placeholder="e.g., driver_license_john.pdf"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    value={uploadForm.issue_date}
                    onChange={(e) => setUploadForm({ ...uploadForm, issue_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={uploadForm.expiry_date}
                    onChange={(e) => setUploadForm({ ...uploadForm, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Document Number (Optional)</Label>
                <Input
                  value={uploadForm.document_number}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_number: e.target.value })}
                  placeholder="e.g., DL-123456"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload}>Upload Document</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Documents ({filteredDocuments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      No documents found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-primary/60" />
                          <div>
                            <p className="font-medium">{doc.file_name}</p>
                            {doc.document_number && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {doc.document_number}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getEntityName(doc)}</p>
                          <p className="text-xs text-muted-foreground capitalize">{doc.entity_type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {doc.document_type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{getExpiryBadge(doc.expiry_date)}</TableCell>
                      <TableCell>
                        {doc.expiry_date ? format(new Date(doc.expiry_date), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        {doc.is_verified ? (
                          <Badge className="bg-success/10 text-success border-success/20 gap-1">
                            <Shield className="w-3 h-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => verifyDocument(doc.id, "current-user")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteDocument(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

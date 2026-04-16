import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { FileText, AlertTriangle, CheckCircle2, Clock, FolderOpen } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  expiry_date: string | null;
  is_verified: boolean;
  created_at: string;
  document_number: string | null;
}

const DOC_CATEGORIES = [
  { key: "license", label: "Driver's License", types: ["license", "drivers_license", "driving_license"] },
  { key: "medical", label: "Medical Certificate", types: ["medical_certificate", "medical", "fitness_certificate"] },
  { key: "training", label: "Training Certificates", types: ["training_certificate", "training", "certification"] },
  { key: "employment", label: "Employment Documents", types: ["contract", "employment", "id_card", "nda"] },
  { key: "insurance", label: "Insurance", types: ["insurance", "liability"] },
  { key: "other", label: "Other Documents", types: [] },
];

interface DriverDocumentVaultProps {
  driverId: string;
  driverName: string;
}

export const DriverDocumentVault = ({ driverId, driverName }: DriverDocumentVaultProps) => {
  const { organizationId } = useOrganization();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !driverId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("entity_type", "driver")
        .eq("entity_id", driverId)
        .order("created_at", { ascending: false });
      setDocuments((data as Document[]) || []);
      setLoading(false);
    };
    fetch();
  }, [driverId, organizationId]);

  const categorize = (doc: Document) => {
    const cat = DOC_CATEGORIES.find(c => c.types.some(t => doc.document_type.toLowerCase().includes(t)));
    return cat?.key || "other";
  };

  const getExpiryStatus = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (isPast(new Date(date))) return { label: "Expired", variant: "destructive" as const, days };
    if (days <= 30) return { label: `${days}d left`, variant: "destructive" as const, days };
    if (days <= 90) return { label: `${days}d left`, variant: "secondary" as const, days };
    return { label: `${days}d left`, variant: "outline" as const, days };
  };

  const expiringCount = documents.filter(d => {
    const s = getExpiryStatus(d.expiry_date);
    return s && s.days <= 90;
  }).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <FileText className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{documents.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
            <p className="text-2xl font-bold">{documents.filter(d => d.is_verified).length}</p>
            <p className="text-[10px] text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-amber-400" />
            <p className="text-2xl font-bold">{expiringCount}</p>
            <p className="text-[10px] text-muted-foreground">Expiring Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{documents.filter(d => !d.is_verified).length}</p>
            <p className="text-[10px] text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
      </div>

      {/* Document Categories */}
      {DOC_CATEGORIES.map(cat => {
        const catDocs = documents.filter(d => categorize(d) === cat.key);
        if (catDocs.length === 0) return null;
        return (
          <Card key={cat.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                {cat.label}
                <Badge variant="secondary" className="ml-auto">{catDocs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {catDocs.map(doc => {
                const expiry = getExpiryStatus(doc.expiry_date);
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{doc.document_type}</span>
                        {doc.document_number && <span className="text-[10px] text-muted-foreground">#{doc.document_number}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.is_verified ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Pending</Badge>
                      )}
                      {expiry && <Badge variant={expiry.variant} className="text-[10px]">{expiry.label}</Badge>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {documents.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No documents found for {driverName}</p>
            <p className="text-xs mt-1">Upload documents from the Documents module to populate this vault.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

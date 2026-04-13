import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, CheckCircle, Clock, Search, Plus, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const DocumentManagement = () => {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const verified = documents.filter((d: any) => d.is_verified);
  const expiring = documents.filter((d: any) => {
    if (!d.expiry_date) return false;
    const diff = new Date(d.expiry_date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  });

  const filtered = documents.filter((d: any) => {
    const matchSearch = !search || d.file_name?.toLowerCase().includes(search.toLowerCase()) || d.document_number?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || d.document_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Document Management</h1><p className="text-muted-foreground">Centralized document storage, verification, and expiry tracking</p></div>
          <Button><Upload className="h-4 w-4 mr-2" /> Upload Document</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><FileText className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{documents.length}</p><p className="text-sm text-muted-foreground">Total Documents</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{verified.length}</p><p className="text-sm text-muted-foreground">Verified</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{expiring.length}</p><p className="text-sm text-muted-foreground">Expiring Soon</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><File className="h-8 w-8 text-muted-foreground" /><div><p className="text-2xl font-bold">{documents.length - verified.length}</p><p className="text-sm text-muted-foreground">Pending Verification</p></div></div></CardContent></Card>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="registration">Registration</SelectItem><SelectItem value="insurance">Insurance</SelectItem><SelectItem value="license">License</SelectItem><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="contract">Contract</SelectItem></SelectContent></Select>
        </div>

        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Entity</TableHead><TableHead>Doc #</TableHead><TableHead>Issued</TableHead><TableHead>Expires</TableHead><TableHead>Verified</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No documents found</TableCell></TableRow> :
            filtered.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.file_name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{d.document_type}</Badge></TableCell>
                <TableCell className="capitalize">{d.entity_type}</TableCell>
                <TableCell className="font-mono">{d.document_number || "—"}</TableCell>
                <TableCell>{d.issue_date ? format(new Date(d.issue_date), "MMM dd, yyyy") : "—"}</TableCell>
                <TableCell>{d.expiry_date ? format(new Date(d.expiry_date), "MMM dd, yyyy") : "—"}</TableCell>
                <TableCell><Badge variant={d.is_verified ? "default" : "secondary"}>{d.is_verified ? "Verified" : "Pending"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></Card>
      </div>
    </Layout>
  );
};

export default DocumentManagement;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, CheckCircle, Star, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

const VendorManagement = () => {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const active = vendors.filter((v: any) => v.is_active);
  const filtered = vendors.filter((v: any) => !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.category?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Vendor Management</h1><p className="text-muted-foreground">Manage suppliers, service providers, and vendor contracts</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> Add Vendor</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Building2 className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{vendors.length}</p><p className="text-sm text-muted-foreground">Total Vendors</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{active.length}</p><p className="text-sm text-muted-foreground">Active</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Star className="h-8 w-8 text-yellow-500" /><div><p className="text-2xl font-bold">{vendors.filter((v: any) => v.rating && v.rating >= 4).length}</p><p className="text-sm text-muted-foreground">Top Rated (4+)</p></div></div></CardContent></Card>
        </div>

        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Category</TableHead><TableHead>Contract #</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No vendors found</TableCell></TableRow> :
            filtered.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.contact_person || "—"}</TableCell>
                <TableCell>{v.email || "—"}</TableCell>
                <TableCell>{v.phone || "—"}</TableCell>
                <TableCell className="capitalize">{v.category}</TableCell>
                <TableCell className="font-mono">{v.contract_number || "—"}</TableCell>
                <TableCell>{v.rating ? `${v.rating}/5` : "—"}</TableCell>
                <TableCell><Badge variant={v.is_active ? "default" : "secondary"}>{v.is_active ? "Active" : "Inactive"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></Card>
      </div>
    </Layout>
  );
};

export default VendorManagement;

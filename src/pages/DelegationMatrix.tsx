import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ArrowRight, Plus, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const DelegationMatrix = () => {
  const { organizationId } = useOrganization();

  const { data: delegations = [], isLoading } = useQuery({
    queryKey: ["delegation-matrix", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("delegation_matrix")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const active = delegations.filter((d: any) => d.is_active);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Delegation Matrix</h1><p className="text-muted-foreground">Manage approval authority delegations and substitutions</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> Add Delegation</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{delegations.length}</p><p className="text-sm text-muted-foreground">Total Delegations</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{active.length}</p><p className="text-sm text-muted-foreground">Active</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><XCircle className="h-8 w-8 text-muted-foreground" /><div><p className="text-2xl font-bold">{delegations.length - active.length}</p><p className="text-sm text-muted-foreground">Expired/Inactive</p></div></div></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle>Delegation Records</CardTitle></CardHeader>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Delegator</TableHead><TableHead></TableHead><TableHead>Delegate</TableHead><TableHead>Scope</TableHead><TableHead>Valid From</TableHead><TableHead>Valid Until</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
              delegations.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No delegations configured</TableCell></TableRow> :
              delegations.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.delegator_name}</TableCell>
                  <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  <TableCell className="font-medium">{d.delegate_name}</TableCell>
                  <TableCell className="capitalize">{d.scope || "All"}</TableCell>
                  <TableCell>{format(new Date(d.valid_from), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{d.valid_until ? format(new Date(d.valid_until), "MMM dd, yyyy") : "Indefinite"}</TableCell>
                  <TableCell><Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
};

export default DelegationMatrix;

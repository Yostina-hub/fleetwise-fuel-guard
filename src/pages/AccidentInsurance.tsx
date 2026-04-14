import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, AlertTriangle, DollarSign, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

import { useTranslation } from 'react-i18next';
const AccidentInsurance = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ["accident-claims", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("accident_claims")
        .select("*, vehicles(plate_number)")
        .eq("organization_id", organizationId)
        .order("accident_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["insurance-policies", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("vehicle_insurance")
        .select("*, vehicles(plate_number)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const totalClaimAmount = claims.reduce((s: number, c: any) => s + (c.claim_amount || 0), 0);
  const openClaims = claims.filter((c: any) => c.status === "filed" || c.status === "under_review");
  const activePolicies = policies.filter((p: any) => p.status === "active");

  const statusColor = (s: string) => {
    switch (s) { case "filed": return "outline"; case "under_review": return "secondary"; case "approved": return "default"; case "settled": return "default"; case "denied": return "destructive"; default: return "outline"; }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">{t('pages.accident_insurance.title', 'Accident & Insurance Management')}</h1><p className="text-muted-foreground">{t('pages.accident_insurance.description', 'Track insurance policies, accident claims, and repair costs')}</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> New Claim</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Shield className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{activePolicies.length}</p><p className="text-sm text-muted-foreground">Active Policies</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><FileText className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{claims.length}</p><p className="text-sm text-muted-foreground">Total Claims</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{openClaims.length}</p><p className="text-sm text-muted-foreground">Open Claims</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{totalClaimAmount.toLocaleString()} ETB</p><p className="text-sm text-muted-foreground">Total Claimed</p></div></div></CardContent></Card>
        </div>

        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search claims or policies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        <Tabs defaultValue="claims">
          <TabsList><TabsTrigger value="claims">Accident Claims</TabsTrigger><TabsTrigger value="policies">Insurance Policies</TabsTrigger></TabsList>
          <TabsContent value="claims">
            <Card><Table>
              <TableHeader><TableRow>
                <TableHead>Claim #</TableHead><TableHead>Date</TableHead><TableHead>Vehicle</TableHead><TableHead>Location</TableHead><TableHead>Amount</TableHead><TableHead>Fault</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {claimsLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
                claims.filter((c: any) => !search || c.claim_number?.toLowerCase().includes(search.toLowerCase()) || c.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase())).length === 0 ?
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No claims recorded</TableCell></TableRow> :
                claims.filter((c: any) => !search || c.claim_number?.toLowerCase().includes(search.toLowerCase()) || c.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase())).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.claim_number}</TableCell>
                    <TableCell>{format(new Date(c.accident_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-medium">{c.vehicles?.plate_number || "—"}</TableCell>
                    <TableCell>{c.accident_location || "—"}</TableCell>
                    <TableCell>{c.claim_amount ? `${c.claim_amount.toLocaleString()} ETB` : "—"}</TableCell>
                    <TableCell className="capitalize">{c.fault_determination || "—"}</TableCell>
                    <TableCell><Badge variant={statusColor(c.status)}>{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></Card>
          </TabsContent>
          <TabsContent value="policies">
            <Card><Table>
              <TableHeader><TableRow>
                <TableHead>Policy #</TableHead><TableHead>Vehicle</TableHead><TableHead>Provider</TableHead><TableHead>Coverage</TableHead><TableHead>Premium</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {policiesLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
                policies.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No policies recorded</TableCell></TableRow> :
                policies.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.policy_number}</TableCell>
                    <TableCell className="font-medium">{p.vehicles?.plate_number || "—"}</TableCell>
                    <TableCell>{p.provider || "—"}</TableCell>
                    <TableCell className="capitalize">{p.coverage_type || "—"}</TableCell>
                    <TableCell>{p.premium_amount ? `${p.premium_amount.toLocaleString()} ETB` : "—"}</TableCell>
                    <TableCell>{p.end_date ? format(new Date(p.end_date), "MMM dd, yyyy") : "—"}</TableCell>
                    <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AccidentInsurance;

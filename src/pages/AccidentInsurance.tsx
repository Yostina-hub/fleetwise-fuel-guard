import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, AlertTriangle, DollarSign, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, differenceInDays } from "date-fns";
import { useTranslation } from 'react-i18next';
import { NewClaimDialog } from "@/components/accident-insurance/NewClaimDialog";
import { ClaimDetailDialog } from "@/components/accident-insurance/ClaimDetailDialog";
import { NewPolicyDialog } from "@/components/accident-insurance/NewPolicyDialog";

const AccidentInsurance = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [showNewPolicy, setShowNewPolicy] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("claims");

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
  const expiringPolicies = policies.filter((p: any) => {
    if (!p.expiry_date) return false;
    const days = differenceInDays(new Date(p.expiry_date), new Date());
    return days >= 0 && days <= 30;
  });

  const statusColor = (s: string) => {
    switch (s) { case "filed": return "outline"; case "under_review": return "secondary"; case "approved": return "default"; case "settled": return "default"; case "denied": return "destructive"; default: return "outline"; }
  };

  const filteredClaims = claims.filter((c: any) => !search || c.claim_number?.toLowerCase().includes(search.toLowerCase()) || c.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase()));
  const filteredPolicies = policies.filter((p: any) => !search || p.policy_number?.toLowerCase().includes(search.toLowerCase()) || p.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase()) || p.provider?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{t('pages.accident_insurance.title', 'Accident & Insurance')}</h1>
              <p className="text-muted-foreground text-xs">{t('pages.accident_insurance.description', 'Track insurance policies, accident claims, and repair costs')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewPolicy(true)}><Plus className="h-4 w-4 mr-2" /> New Policy</Button>
            <Button onClick={() => setShowNewClaim(true)}><Plus className="h-4 w-4 mr-2" /> New Claim</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Active Policies", value: activePolicies.length, icon: Shield, color: "text-primary" },
            { label: "Expiring Soon", value: expiringPolicies.length, icon: AlertTriangle, color: "text-amber-600" },
            { label: "Total Claims", value: claims.length, icon: FileText, color: "text-blue-500" },
            { label: "Open Claims", value: openClaims.length, icon: AlertTriangle, color: "text-orange-500" },
            { label: "Total Claimed", value: `${totalClaimAmount.toLocaleString()} ETB`, icon: DollarSign, color: "text-emerald-600" },
          ].map((s, i) => (
            <Card key={i}><CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent></Card>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search claims or policies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="claims" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Accident Claims ({claims.length})</TabsTrigger>
            <TabsTrigger value="policies" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Insurance Policies ({policies.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="claims">
            <Card><Table>
              <TableHeader><TableRow>
                <TableHead>Claim #</TableHead><TableHead>Date</TableHead><TableHead>Vehicle</TableHead><TableHead>Location</TableHead><TableHead>Amount</TableHead><TableHead>Fault</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {claimsLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filteredClaims.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No claims recorded</TableCell></TableRow>
                ) : (
                  filteredClaims.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedClaim(c)}>
                      <TableCell className="font-mono">{c.claim_number}</TableCell>
                      <TableCell>{format(new Date(c.accident_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="font-medium">{c.vehicles?.plate_number || "—"}</TableCell>
                      <TableCell>{c.accident_location || "—"}</TableCell>
                      <TableCell>{c.claim_amount ? `${c.claim_amount.toLocaleString()} ETB` : "—"}</TableCell>
                      <TableCell className="capitalize">{c.fault_determination?.replace(/_/g, " ") || "—"}</TableCell>
                      <TableCell><Badge variant={statusColor(c.status)}>{c.status?.replace(/_/g, " ")}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table></Card>
          </TabsContent>

          <TabsContent value="policies">
            <Card><Table>
              <TableHeader><TableRow>
                <TableHead>Policy #</TableHead><TableHead>Vehicle</TableHead><TableHead>Provider</TableHead><TableHead>Coverage</TableHead><TableHead>Premium</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {policiesLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filteredPolicies.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No policies recorded</TableCell></TableRow>
                ) : (
                  filteredPolicies.map((p: any) => {
                    const daysUntilExpiry = p.expiry_date ? differenceInDays(new Date(p.expiry_date), new Date()) : null;
                    const isExpiring = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
                    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{p.policy_number}</TableCell>
                        <TableCell className="font-medium">{p.vehicles?.plate_number || "—"}</TableCell>
                        <TableCell>{p.provider || "—"}</TableCell>
                        <TableCell className="capitalize">{p.insurance_type?.replace(/_/g, " ") || "—"}</TableCell>
                        <TableCell>{p.premium_amount ? `${p.premium_amount.toLocaleString()} ETB` : "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {p.expiry_date ? format(new Date(p.expiry_date), "MMM dd, yyyy") : "—"}
                            {isExpiring && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">{daysUntilExpiry}d</Badge>}
                            {isExpired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                          {p.auto_renewal && <Badge variant="outline" className="ml-1 text-[10px]">Auto</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table></Card>
          </TabsContent>
        </Tabs>

        <NewClaimDialog open={showNewClaim} onOpenChange={setShowNewClaim} />
        <NewPolicyDialog open={showNewPolicy} onOpenChange={setShowNewPolicy} />
        <ClaimDetailDialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)} claim={selectedClaim} />
      </div>
    </Layout>
  );
};

export default AccidentInsurance;

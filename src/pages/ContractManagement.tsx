import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSignature, CheckCircle, Clock, DollarSign, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

import { useTranslation } from 'react-i18next';
const ContractManagement = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const active = contracts.filter((c: any) => c.status === "active");
  const totalValue = active.reduce((s: number, c: any) => s + (c.value || 0), 0);
  const expiring = contracts.filter((c: any) => {
    if (!c.end_date) return false;
    const diff = new Date(c.end_date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  });

  const filtered = contracts.filter((c: any) => !search || c.contract_number?.toLowerCase().includes(search.toLowerCase()) || c.party_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">{t('pages.contract_management.title', 'Contract Management')}</h1><p className="text-muted-foreground">{t('pages.contract_management.description', 'Manage vendor contracts, renewals, and service agreements')}</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> New Contract</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><FileSignature className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{contracts.length}</p><p className="text-sm text-muted-foreground">{t('contracts.totalContracts', 'Total Contracts')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{active.length}</p><p className="text-sm text-muted-foreground">{t('common.active', 'Active')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{expiring.length}</p><p className="text-sm text-muted-foreground">{t('common.expiringSoon', 'Expiring Soon')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{totalValue.toLocaleString()} ETB</p><p className="text-sm text-muted-foreground">{t('contracts.activeValue', 'Active Value')}</p></div></div></CardContent></Card>
        </div>

        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder={t('contracts.search', 'Search contracts...')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>{t('contracts.contractNumber', 'Contract #')}</TableHead><TableHead>{t('common.type', 'Type')}</TableHead><TableHead>{t('contracts.party', 'Party')}</TableHead><TableHead>{t('common.start', 'Start')}</TableHead><TableHead>{t('common.end', 'End')}</TableHead><TableHead>{t('common.value', 'Value')}</TableHead><TableHead>{t('contracts.autoRenew', 'Auto-Renew')}</TableHead><TableHead>{t('common.status', 'Status')}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">{t('common.loading', 'Loading...')}<TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('contracts.noContracts', 'No contracts found')}<TableCell></TableRow> :
            filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono">{c.contract_number}</TableCell>
                <TableCell className="capitalize">{c.contract_type}</TableCell>
                <TableCell className="font-medium">{c.party_name}</TableCell>
                <TableCell>{format(new Date(c.start_date), "MMM dd, yyyy")}</TableCell>
                <TableCell>{c.end_date ? format(new Date(c.end_date), "MMM dd, yyyy") : t('contracts.indefinite', 'Indefinite')}</TableCell>
                <TableCell>{c.value ? `${c.value.toLocaleString()} ${c.currency}` : "—"}</TableCell>
                <TableCell>{c.auto_renew ? "Yes" : "No"}</TableCell>
                <TableCell><Badge variant={c.status === "active" ? "default" : c.status === "expired" ? "destructive" : "secondary"}>{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></Card>
      </div>
    </Layout>
  );
};

export default ContractManagement;

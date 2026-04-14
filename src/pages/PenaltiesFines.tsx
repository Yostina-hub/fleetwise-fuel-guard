import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gavel, DollarSign, Clock, CheckCircle, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

import { useTranslation } from 'react-i18next';
const PenaltiesFines = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");

  const { data: fines = [], isLoading } = useQuery({
    queryKey: ["penalties-fines", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("penalties_fines")
        .select("*, vehicles(plate_number), drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("violation_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const unpaid = fines.filter((f: any) => f.payment_status === "unpaid");
  const totalUnpaid = unpaid.reduce((s: number, f: any) => s + (f.amount || 0), 0);
  const totalPaid = fines.filter((f: any) => f.payment_status === "paid").reduce((s: number, f: any) => s + (f.paid_amount || f.amount || 0), 0);

  const filtered = fines.filter((f: any) => !search || f.fine_number?.toLowerCase().includes(search.toLowerCase()) || f.violation_type?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">{t('pages.penalties_fines.title', 'Penalties & Fines')}</h1><p className="text-muted-foreground">{t('pages.penalties_fines.description', 'Track traffic violations, fines, and payment status')}</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> Record Fine</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Gavel className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{fines.length}</p><p className="text-sm text-muted-foreground">{t('fines.totalFines', 'Total Fines')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{unpaid.length}</p><p className="text-sm text-muted-foreground">{t('fines.unpaid', 'Unpaid')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{totalUnpaid.toLocaleString()} ETB</p><p className="text-sm text-muted-foreground">{t('fines.outstanding', 'Outstanding')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{totalPaid.toLocaleString()} ETB</p><p className="text-sm text-muted-foreground">{t('fines.totalPaid', 'Total Paid')}</p></div></div></CardContent></Card>
        </div>

        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder={t('fines.search', 'Search fines...')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>{t('fines.fineNumber', 'Fine #')}</TableHead><TableHead>{t('common.date', 'Date')}</TableHead><TableHead>{t('common.vehicle', 'Vehicle')}</TableHead><TableHead>{t('common.driver', 'Driver')}</TableHead><TableHead>{t('fines.violation', 'Violation')}</TableHead><TableHead>{t('common.amount', 'Amount')}</TableHead><TableHead>{t('common.dueDate', 'Due Date')}</TableHead><TableHead>{t('common.status', 'Status')}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">{t('common.loading', 'Loading...')}</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('fines.noFines', 'No fines recorded')}<TableCell></TableRow> :
            filtered.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono">{f.fine_number}</TableCell>
                <TableCell>{format(new Date(f.violation_date), "MMM dd, yyyy")}</TableCell>
                <TableCell className="font-medium">{f.vehicles?.plate_number || "—"}</TableCell>
                <TableCell>{f.drivers ? `${f.drivers.first_name} ${f.drivers.last_name}` : "—"}</TableCell>
                <TableCell className="capitalize">{f.violation_type}</TableCell>
                <TableCell className="font-bold">{f.amount.toLocaleString()} ETB</TableCell>
                <TableCell>{f.due_date ? format(new Date(f.due_date), "MMM dd, yyyy") : "—"}</TableCell>
                <TableCell><Badge variant={f.payment_status === "paid" ? "default" : f.payment_status === "overdue" ? "destructive" : "secondary"}>{f.payment_status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></Card>
      </div>
    </Layout>
  );
};

export default PenaltiesFines;

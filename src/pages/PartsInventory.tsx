import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, AlertTriangle, CheckCircle, DollarSign, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

import { useTranslation } from 'react-i18next';
const PartsInventory = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["parts-inventory", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("parts_inventory")
        .select("*")
        .eq("organization_id", organizationId)
        .order("part_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const lowStock = parts.filter((p: any) => p.quantity <= (p.min_stock_level || 5));
  const totalValue = parts.reduce((s: number, p: any) => s + (p.quantity * (p.unit_cost || 0)), 0);

  const filtered = parts.filter((p: any) => !search || p.part_name?.toLowerCase().includes(search.toLowerCase()) || p.part_number?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">{t('pages.parts_inventory.title', 'Parts Inventory')}</h1><p className="text-muted-foreground">{t('pages.parts_inventory.description', 'Track spare parts, stock levels, and reorder points')}</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> Add Part</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Package className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{parts.length}</p><p className="text-sm text-muted-foreground">{t('parts.totalParts', 'Total Parts')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{parts.filter((p: any) => p.quantity > (p.min_stock_level || 5)).length}</p><p className="text-sm text-muted-foreground">{t('parts.inStock', 'In Stock')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{lowStock.length}</p><p className="text-sm text-muted-foreground">{t('parts.lowStock', 'Low Stock')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{totalValue.toLocaleString()} ETB</p><p className="text-sm text-muted-foreground">{t('parts.inventoryValue', 'Inventory Value')}</p></div></div></CardContent></Card>
        </div>

        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder={t('parts.search', 'Search parts...')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>{t('parts.partNumber', 'Part #')}</TableHead><TableHead>{t('common.name', 'Name')}</TableHead><TableHead>{t('common.category', 'Category')}</TableHead><TableHead>{t('parts.qty', 'Qty')}</TableHead><TableHead>{t('parts.minStock', 'Min Stock')}</TableHead><TableHead>{t('parts.unitCost', 'Unit Cost')}</TableHead><TableHead>{t('parts.supplier', 'Supplier')}</TableHead><TableHead>{t('common.location', 'Location')}</TableHead><TableHead>{t('common.status', 'Status')}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8">{t('common.loading', 'Loading...')}</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('parts.noParts', 'No parts in inventory')}</TableCell></TableRow> :
            filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono">{p.part_number}</TableCell>
                <TableCell className="font-medium">{p.part_name}</TableCell>
                <TableCell className="capitalize">{p.category || "—"}</TableCell>
                <TableCell className={p.quantity <= (p.min_stock_level || 5) ? "text-destructive font-bold" : ""}>{p.quantity}</TableCell>
                <TableCell>{p.min_stock_level}</TableCell>
                <TableCell>{p.unit_cost ? `${p.unit_cost} ETB` : "—"}</TableCell>
                <TableCell>{p.supplier || "—"}</TableCell>
                <TableCell>{p.location || "—"}</TableCell>
                <TableCell><Badge variant={p.quantity <= (p.min_stock_level || 5) ? "destructive" : "default"}>{p.quantity <= (p.min_stock_level || 5) ? "Low" : "OK"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></Card>
      </div>
    </Layout>
  );
};

export default PartsInventory;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, CheckCircle, AlertTriangle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, differenceInDays } from "date-fns";

import { useTranslation } from 'react-i18next';
const ComplianceCalendar = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["compliance-calendar", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("compliance_calendar")
        .select("*")
        .eq("organization_id", organizationId)
        .order("deadline", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const upcoming = items.filter((i: any) => i.status === "upcoming");
  const overdue = items.filter((i: any) => new Date(i.deadline) < new Date() && i.status !== "completed");
  const completed = items.filter((i: any) => i.status === "completed");
  const dueSoon = items.filter((i: any) => {
    const days = differenceInDays(new Date(i.deadline), new Date());
    return days >= 0 && days <= 7 && i.status !== "completed";
  });

  const urgencyBadge = (deadline: string, status: string) => {
    if (status === "completed") return <Badge variant="default">Completed</Badge>;
    const days = differenceInDays(new Date(deadline), new Date());
    if (days < 0) return <Badge variant="destructive">Overdue</Badge>;
    if (days <= 7) return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Due Soon</Badge>;
    return <Badge variant="outline">Upcoming</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">{t('pages.compliance_calendar.title', 'Compliance Calendar')}</h1><p className="text-muted-foreground">{t('pages.compliance_calendar.description', 'Track regulatory deadlines, renewals, and compliance milestones')}</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> Add Deadline</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Calendar className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{items.length}</p><p className="text-sm text-muted-foreground">Total Items</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{overdue.length}</p><p className="text-sm text-muted-foreground">Overdue</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{dueSoon.length}</p><p className="text-sm text-muted-foreground">Due This Week</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{completed.length}</p><p className="text-sm text-muted-foreground">Completed</p></div></div></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle>Compliance Deadlines</CardTitle></CardHeader>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Entity</TableHead><TableHead>Deadline</TableHead><TableHead>Days Left</TableHead><TableHead>Assigned To</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
              items.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No compliance items scheduled</TableCell></TableRow> :
              items.map((i: any) => {
                const days = differenceInDays(new Date(i.deadline), new Date());
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.title}</TableCell>
                    <TableCell className="capitalize">{i.category}</TableCell>
                    <TableCell className="capitalize">{i.entity_type || "—"}</TableCell>
                    <TableCell>{format(new Date(i.deadline), "MMM dd, yyyy")}</TableCell>
                    <TableCell className={days < 0 ? "text-destructive font-bold" : days <= 7 ? "text-orange-600 font-bold" : ""}>{i.status === "completed" ? "—" : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</TableCell>
                    <TableCell>{i.assigned_to || "—"}</TableCell>
                    <TableCell>{urgencyBadge(i.deadline, i.status)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
};

export default ComplianceCalendar;

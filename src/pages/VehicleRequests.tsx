import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Clock, CheckCircle, XCircle, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const VehicleRequests = () => {
  const { organizationId } = useOrganization();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["vehicle-requests", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const statusColors: Record<string, string> = {
    pending: "secondary",
    approved: "default",
    assigned: "default",
    rejected: "destructive",
    completed: "outline",
    cancelled: "secondary",
  };

  const pending = requests?.filter((r: any) => r.status === "pending").length || 0;
  const assigned = requests?.filter((r: any) => r.status === "assigned").length || 0;
  const completed = requests?.filter((r: any) => r.status === "completed").length || 0;

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Vehicle Requests</h1>
              <p className="text-muted-foreground text-xs">Request, approve & assign vehicles</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Request
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-500" /></div>
            <div><p className="text-xl font-bold">{pending}</p><p className="text-xs text-muted-foreground">Pending</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Truck className="w-4 h-4 text-blue-500" /></div>
            <div><p className="text-xl font-bold">{assigned}</p><p className="text-xs text-muted-foreground">Assigned</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-500" /></div>
            <div><p className="text-xl font-bold">{completed}</p><p className="text-xs text-muted-foreground">Completed</p></div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">All Requests</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="animate-pulse h-32" /> : (!requests || requests.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No vehicle requests yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3">Request #</th>
                    <th className="text-left py-2 px-3">Requester</th>
                    <th className="text-left py-2 px-3">Purpose</th>
                    <th className="text-left py-2 px-3">Needed From</th>
                    <th className="text-center py-2 px-3">Priority</th>
                    <th className="text-center py-2 px-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {requests.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{r.request_number}</td>
                        <td className="py-2 px-3">{r.requester_name}</td>
                        <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate">{r.purpose}</td>
                        <td className="py-2 px-3 text-muted-foreground">{format(new Date(r.needed_from), "MMM dd, HH:mm")}</td>
                        <td className="py-2 px-3 text-center"><Badge variant="outline" className="text-[10px]">{r.priority}</Badge></td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={(statusColors[r.status] || "secondary") as any} className="text-[10px]">{r.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default VehicleRequests;

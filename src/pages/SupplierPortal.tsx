import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Wrench } from "lucide-react";
import { format } from "date-fns";
import { WorkOrderMessageThread } from "@/components/maintenance-enterprise/WorkOrderMessageThread";
import { SupplierPaymentRequestForm } from "@/components/maintenance-enterprise/SupplierPaymentRequestForm";

export default function SupplierPortal() {
  const { user } = useAuthContext();
  const [selected, setSelected] = useState<any>(null);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ["supplier-work-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("work_orders")
        .select("*, vehicles(plate_number, make, model)")
        .eq("supplier_user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Supplier Portal</h1>
        <p className="text-muted-foreground">Work orders assigned to you</p>
      </div>

      {workOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No work orders assigned to your account yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {workOrders.map((wo: any) => (
            <Card key={wo.id} className="hover:shadow-md transition cursor-pointer" onClick={() => setSelected(wo)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{wo.work_order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{wo.vehicles?.plate_number} — {wo.vehicles?.make} {wo.vehicles?.model}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant={wo.status === "completed" ? "default" : "outline"}>{wo.status}</Badge>
                    <Badge variant={wo.priority === "critical" ? "destructive" : "secondary"}>{wo.priority}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{wo.service_description}</p>
                <p className="text-xs text-muted-foreground mt-2">Scheduled: {wo.scheduled_date ? format(new Date(wo.scheduled_date), "PPP") : "TBD"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.work_order_number} — {selected.vehicles?.plate_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selected.service_description}</p>
                <WorkOrderMessageThread
                  workOrderId={selected.id}
                  organizationId={selected.organization_id}
                  senderType="supplier"
                />
                <SupplierPaymentRequestForm
                  workOrderId={selected.id}
                  organizationId={selected.organization_id}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

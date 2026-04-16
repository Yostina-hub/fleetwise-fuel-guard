import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Wrench, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function SupplierWorkOrderView() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wo, setWo] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wo-supplier-magic-link?action=verify&token=${token}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Invalid link");
        setWo(data.work_order);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
            <p className="text-xs text-muted-foreground mt-4">This link may have expired. Contact the fleet maintenance team for a new one.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!wo) return null;

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="text-center">
          <Badge variant="outline" className="mb-2">External Supplier Access</Badge>
          <h1 className="text-2xl font-bold">{wo.work_order_number}</h1>
          <p className="text-muted-foreground">{wo.service_description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5" />Work Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Asset:</span> <strong>{wo.vehicles?.plate_number} — {wo.vehicles?.make} {wo.vehicles?.model}</strong></div>
              <div><span className="text-muted-foreground">Priority:</span> <Badge>{wo.priority}</Badge></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{wo.status}</Badge></div>
              <div><span className="text-muted-foreground">Type:</span> {wo.work_type}</div>
              <div><span className="text-muted-foreground"><Calendar className="w-3 h-3 inline" /> Scheduled:</span> {wo.scheduled_date ? format(new Date(wo.scheduled_date), "PPP") : "—"}</div>
              <div><span className="text-muted-foreground">Department:</span> {wo.assigned_department || "—"}</div>
            </div>
            {wo.additional_description && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-1">Additional Description</p>
                <p className="text-sm text-muted-foreground">{wo.additional_description}</p>
              </div>
            )}
            {(wo.remark_1 || wo.remark_2 || wo.remark_3 || wo.remark_4) && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-1">Remarks</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {[wo.remark_1, wo.remark_2, wo.remark_3, wo.remark_4].filter(Boolean).map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Once you've completed the work, contact the fleet team to confirm completion. A magic link does not allow direct status changes — for full editing, request a supplier portal account.</p>
            <div className="text-xs bg-muted/40 p-3 rounded">
              <strong>POR:</strong> {wo.por_number || "Pending"} · <strong>POR Status:</strong> {wo.por_status || "—"}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">Powered by Lovable Cloud Fleet Management</p>
      </div>
    </div>
  );
}

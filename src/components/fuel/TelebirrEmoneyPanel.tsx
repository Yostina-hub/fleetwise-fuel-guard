// Telebirr e-money operations panel for a fuel work order.
// Renders the live status of: transfer → PIN confirmation → SMS receipt → pullback.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, CheckCircle2, AlertCircle, Send, RefreshCw, Phone, Banknote } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  workOrderId: string;
  fuelRequestId: string;
  driverPhone?: string;
  approvedAmount: number;
  canApprove: boolean;
}

export function TelebirrEmoneyPanel({ workOrderId, fuelRequestId, driverPhone, approvedAmount, canApprove }: Props) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(driverPhone || "");
  const [amount, setAmount] = useState(approvedAmount.toString());
  const [pin, setPin] = useState("");
  const [actualUsed, setActualUsed] = useState("");

  const { data: wo, refetch } = useQuery({
    queryKey: ["fuel-wo-telebirr", workOrderId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("fuel_work_orders").select("*").eq("id", workOrderId).single();
      return data;
    },
    refetchInterval: 4000,
  });

  const { data: txns = [] } = useQuery({
    queryKey: ["fuel-telebirr-txns", workOrderId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("fuel_telebirr_transactions")
        .select("*")
        .eq("fuel_work_order_id", workOrderId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const callTelebirr = async (action: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke("telebirr-emoney", {
      body: { action, fuel_work_order_id: workOrderId, ...payload },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const sendSms = async (message: string, message_type: string) => {
    if (!phone) return;
    await supabase.functions.invoke("fuel-sms-notify", {
      body: { phone, message, fuel_work_order_id: workOrderId, message_type },
    });
  };

  const transferMut = useMutation({
    mutationFn: async () => {
      const r = await callTelebirr("transfer", { driver_phone: phone, amount: Number(amount) });
      // Auto-SMS payment effectiveness notice
      await sendSms(
        `Telebirr: ETB ${amount} float sent to your wallet for fuel WO ${wo?.work_order_number}. Use it at an approved station.`,
        "receipt"
      );
      return r;
    },
    onSuccess: (d) => {
      toast.success(`Transfer initiated (${d.provider}) — Ref: ${d.external_ref}`);
      qc.invalidateQueries({ queryKey: ["fuel-wo-telebirr"] });
      qc.invalidateQueries({ queryKey: ["fuel-telebirr-txns"] });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pinMut = useMutation({
    mutationFn: async () => {
      const r = await callTelebirr("confirm_pin", { pin });
      await sendSms(
        `Telebirr: Payment of ETB ${amount} confirmed. Ref: ${r.confirmation_ref}. Balance has been deducted.`,
        "receipt"
      );
      return r;
    },
    onSuccess: () => {
      toast.success("PIN confirmed — payment completed");
      setPin("");
      qc.invalidateQueries({ queryKey: ["fuel-wo-telebirr"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pullbackMut = useMutation({
    mutationFn: async () => {
      const used = Number(actualUsed);
      const remaining = Number(amount) - used;
      if (remaining <= 0) throw new Error("No remaining balance to pull back");
      const r = await callTelebirr("pullback", { pullback_amount: remaining });
      await (supabase as any).from("fuel_work_orders").update({ amount_used: used }).eq("id", workOrderId);
      await sendSms(`Telebirr: Unused balance of ETB ${remaining} returned to corporate wallet.`, "pullback");
      return r;
    },
    onSuccess: () => {
      toast.success("Remaining balance pulled back to corporate wallet");
      qc.invalidateQueries({ queryKey: ["fuel-wo-telebirr"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stage = !wo?.emoney_initiated ? "transfer"
    : !wo?.pin_confirmed_at ? "pin"
    : !wo?.pullback_completed_at ? "pullback"
    : "done";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Telebirr E-Money</span>
          <Button variant="ghost" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status pipeline */}
        <div className="flex items-center justify-between text-xs gap-1">
          {[
            { key: "transfer", label: "1. Transfer", done: !!wo?.emoney_initiated },
            { key: "pin", label: "2. PIN Confirm", done: !!wo?.pin_confirmed_at },
            { key: "sms", label: "3. SMS Receipt", done: !!wo?.sms_receipt_sent_at },
            { key: "pullback", label: "4. Pullback", done: !!wo?.pullback_completed_at },
          ].map((s, i, arr) => (
            <div key={s.key} className="flex items-center flex-1">
              <div className={`flex items-center gap-1 ${s.done ? "text-success" : "text-muted-foreground"}`}>
                {s.done ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                <span className="font-medium">{s.label}</span>
              </div>
              {i < arr.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${s.done ? "bg-success" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <div className="text-xs flex flex-wrap gap-2">
          {wo?.telebirr_provider && <Badge variant="outline">Provider: {wo.telebirr_provider}</Badge>}
          {wo?.emoney_transfer_ref && <Badge variant="outline" className="font-mono">Ref: {wo.emoney_transfer_ref}</Badge>}
          {wo?.amount_remaining != null && <Badge variant="outline">Remaining: ETB {wo.amount_remaining}</Badge>}
        </div>

        {/* Step 1: Transfer */}
        {stage === "transfer" && canApprove && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium">Step 1 — Initiate Telebirr float transfer to driver</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs"><Phone className="w-3 h-3 inline mr-1" /> Driver phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2519..." />
              </div>
              <div>
                <Label className="text-xs"><Banknote className="w-3 h-3 inline mr-1" /> Amount (ETB)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => transferMut.mutate()} disabled={transferMut.isPending || !phone} className="w-full">
              {transferMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-1" /> Send Telebirr float
            </Button>
          </div>
        )}

        {/* Step 2: PIN */}
        {stage === "pin" && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium">Step 2 — Driver confirms payment with PIN at fuel station</p>
            <div className="flex gap-2">
              <Input type="password" maxLength={6} placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
              <Button onClick={() => pinMut.mutate()} disabled={pinMut.isPending || pin.length < 4}>
                {pinMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Driver enters PIN in Telebirr USSD/app. SMS receipt is sent automatically.</p>
          </div>
        )}

        {/* Step 4: Pullback */}
        {stage === "pullback" && canApprove && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium">Step 3 — Pullback unused balance</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Amount actually used (ETB)</Label>
                <Input type="number" value={actualUsed} onChange={(e) => setActualUsed(e.target.value)} placeholder={amount} />
              </div>
              <div>
                <Label className="text-xs">Will return</Label>
                <Input value={actualUsed ? `${Number(amount) - Number(actualUsed)} ETB` : "—"} disabled />
              </div>
            </div>
            <Button variant="outline" onClick={() => pullbackMut.mutate()} disabled={pullbackMut.isPending || !actualUsed} className="w-full">
              {pullbackMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Pullback unused balance
            </Button>
          </div>
        )}

        {stage === "done" && (
          <div className="border-t pt-3 flex items-center gap-2 text-success">
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-medium">Telebirr cycle complete. Pullback Ref: {wo?.pullback_ref}</p>
          </div>
        )}

        {/* Audit trail */}
        {txns.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium mb-1">Telebirr audit log</p>
            <div className="space-y-1 max-h-40 overflow-y-auto text-xs">
              {txns.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1">
                  <span className="capitalize">{t.txn_type}</span>
                  <span className="font-mono text-[10px]">{t.external_ref}</span>
                  <Badge variant={t.status === "success" ? "outline" : "destructive"} className="text-[9px]">{t.status}</Badge>
                  <span className="text-muted-foreground text-[10px]">{format(new Date(t.created_at), "HH:mm:ss")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!canApprove && stage === "transfer" && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <AlertCircle className="w-4 h-4" /> Only fuel admin supervisor can initiate Telebirr transfers.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

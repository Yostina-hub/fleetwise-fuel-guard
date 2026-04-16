import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Paperclip, Send, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";

interface Props {
  workOrderId: string;
  organizationId: string;
  /** Magic-link token (for un-authenticated supplier mode) */
  portalToken?: string;
  senderType?: "fleet_team" | "supplier";
}

export function WorkOrderMessageThread({ workOrderId, organizationId, portalToken, senderType = "fleet_team" }: Props) {
  const { user, profile } = useAuthContext();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ["wo-messages", workOrderId, !!portalToken],
    queryFn: async () => {
      if (portalToken) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wo-supplier-portal?action=list_messages`;
        const r = await fetch(url, { headers: { "x-portal-token": portalToken } });
        const d = await r.json();
        return d.messages || [];
      }
      const { data } = await (supabase as any)
        .from("wo_supplier_messages")
        .select("*")
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    refetchInterval: 8000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Realtime for fleet-side
  useEffect(() => {
    if (portalToken) return;
    const channel = supabase
      .channel(`wo-msg-${workOrderId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wo_supplier_messages", filter: `work_order_id=eq.${workOrderId}` }, () => {
        qc.invalidateQueries({ queryKey: ["wo-messages", workOrderId, false] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workOrderId, portalToken, qc]);

  const send = async (attachment?: { url: string; name: string }) => {
    const message = text.trim();
    if (!message && !attachment) return;
    setSending(true);
    try {
      if (portalToken) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wo-supplier-portal?action=post_message`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "x-portal-token": portalToken, "Content-Type": "application/json" },
          body: JSON.stringify({ message: message || `Sent attachment: ${attachment?.name}`, attachment_url: attachment?.url, attachment_name: attachment?.name }),
        });
        if (!r.ok) throw new Error((await r.json()).error);
      } else {
        const { error } = await (supabase as any).from("wo_supplier_messages").insert({
          organization_id: organizationId,
          work_order_id: workOrderId,
          sender_type: senderType,
          sender_id: user?.id,
          sender_name: (profile as any)?.full_name || user?.email || "Fleet Team",
          message: message || `Sent attachment: ${attachment?.name}`,
          attachment_url: attachment?.url || null,
          attachment_name: attachment?.name || null,
        });
        if (error) throw error;
      }
      setText("");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }
    setUploading(true);
    try {
      let url = "";
      if (portalToken) {
        const fd = new FormData();
        fd.append("file", file);
        const ep = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wo-supplier-portal?action=upload_file`;
        const r = await fetch(ep, { method: "POST", headers: { "x-portal-token": portalToken }, body: fd });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        url = d.signed_url;
      } else {
        const path = `wo/${workOrderId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("supplier-documents").upload(path, file);
        if (error) throw error;
        const { data } = await supabase.storage.from("supplier-documents").createSignedUrl(path, 60 * 60 * 24 * 7);
        url = data?.signedUrl || "";
      }
      await send({ url, name: file.name });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Communication Thread</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="border rounded-md bg-muted/20 p-3 max-h-[400px] overflow-y-auto space-y-2">
          {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No messages yet — start the conversation</p>}
          {messages.map((m: any) => {
            const mine = portalToken ? m.sender_type === "supplier" : m.sender_type === "fleet_team";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-lg p-2.5 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={mine ? "secondary" : "outline"} className="text-[10px] py-0">{m.sender_type === "supplier" ? "Supplier" : "Fleet"}</Badge>
                    <span className="text-[10px] opacity-75">{m.sender_name}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  {m.attachment_url && (
                    <a href={m.attachment_url} target="_blank" rel="noopener" className="mt-1.5 inline-flex items-center gap-1 text-xs underline">
                      <FileText className="w-3 h-3" /> {m.attachment_name || "Attachment"}
                    </a>
                  )}
                  <div className="text-[10px] opacity-70 mt-1">{format(new Date(m.created_at), "PP p")}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            rows={2}
            className="resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
          />
          <input type="file" ref={fileRef} onChange={handleFile} className="hidden" />
          <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </Button>
          <Button type="button" onClick={() => send()} disabled={sending || !text.trim()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">⌘/Ctrl+Enter to send · Max 20MB per file</p>
      </CardContent>
    </Card>
  );
}

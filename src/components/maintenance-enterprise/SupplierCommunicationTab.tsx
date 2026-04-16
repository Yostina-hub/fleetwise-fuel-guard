import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Paperclip, Building2, Users } from "lucide-react";
import { useWoSupplierMessages } from "@/hooks/useWoSupplierMessages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const SupplierCommunicationTab = () => {
  const { organizationId } = useOrganization();
  const [selectedWO, setSelectedWO] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [senderType, setSenderType] = useState("fleet_team");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: workOrders = [] } = useQuery({
    queryKey: ["wo-for-comm", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("work_orders")
        .select("id, work_order_number, status, vendor_id")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { messages, isLoading, sendMessage } = useWoSupplierMessages(selectedWO);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !selectedWO) return;
    sendMessage.mutate({
      sender_type: senderType,
      sender_name: senderType === "fleet_team" ? "Fleet Maintenance Team" : "Service Provider",
      message: newMessage.trim(),
    });
    setNewMessage("");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* WO List */}
      <Card className="glass-strong overflow-y-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Work Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          {workOrders.map(wo => (
            <button key={wo.id}
              className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${selectedWO === wo.id ? "bg-primary/20 border border-primary/40" : "hover:bg-muted/50"}`}
              onClick={() => setSelectedWO(wo.id)}>
              <div className="font-mono font-medium">{wo.work_order_number}</div>
              <Badge variant="outline" className="mt-1 text-xs capitalize">{wo.status}</Badge>
            </button>
          ))}
          {workOrders.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No work orders</p>}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="glass-strong col-span-2 flex flex-col">
        <CardHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {selectedWO ? `Messages — ${workOrders.find(w => w.id === selectedWO)?.work_order_number || ""}` : "Select a work order"}
            </CardTitle>
            {selectedWO && (
              <Select value={senderType} onValueChange={setSenderType}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fleet_team"><div className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Fleet Team</div></SelectItem>
                  <SelectItem value="supplier"><div className="flex items-center gap-1"><Users className="w-3 h-3" /> Supplier</div></SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {!selectedWO ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Select a work order to view messages</div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">No messages yet. Start the conversation.</div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_type === "fleet_team" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-xl p-3 text-sm ${msg.sender_type === "fleet_team" ? "bg-primary/20 border border-primary/30" : "bg-muted border border-border"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-xs">{msg.sender_name}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(msg.created_at), "HH:mm")}</span>
                  </div>
                  <p>{msg.message}</p>
                  {msg.attachment_url && (
                    <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-primary text-xs flex items-center gap-1 mt-1">
                      <Paperclip className="w-3 h-3" /> {msg.attachment_name || "Attachment"}
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        {selectedWO && (
          <div className="p-3 border-t border-border/50 flex gap-2">
            <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..."
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sendMessage.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SupplierCommunicationTab;

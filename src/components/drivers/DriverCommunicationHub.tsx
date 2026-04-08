import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  MessageSquare, Plus, Send, Megaphone, AlertCircle, Mail,
  Bell, Users, CheckCheck,
} from "lucide-react";

const PRIORITY_CONFIG: Record<string, { color: string; icon: typeof Bell }> = {
  low: { color: "bg-muted text-muted-foreground", icon: Mail },
  normal: { color: "bg-blue-500/20 text-blue-400", icon: MessageSquare },
  high: { color: "bg-amber-500/20 text-amber-400", icon: Bell },
  urgent: { color: "bg-destructive/20 text-destructive", icon: AlertCircle },
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof MessageSquare }> = {
  direct: { label: "Direct", icon: MessageSquare },
  announcement: { label: "Announcement", icon: Megaphone },
  alert: { label: "Alert", icon: AlertCircle },
  broadcast: { label: "Broadcast", icon: Users },
  safety_notice: { label: "Safety Notice", icon: AlertCircle },
};

interface Message {
  id: string;
  sender_id: string | null;
  recipient_driver_id: string | null;
  subject: string;
  body: string;
  message_type: string;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export const DriverCommunicationHub = () => {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [form, setForm] = useState({
    recipient_driver_id: "", subject: "", body: "",
    message_type: "direct", priority: "normal",
  });

  const fetchMessages = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("driver_messages")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(200);
    setMessages((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    if (!organizationId) return;
    const channel = supabase
      .channel(`driver-messages-${organizationId.slice(0, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_messages", filter: `organization_id=eq.${organizationId}` }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId]);

  const sendMessage = async () => {
    if (!organizationId || !form.subject.trim() || !form.body.trim()) {
      toast({ title: "Subject and body are required", variant: "destructive" }); return;
    }
    if (form.message_type === "direct" && !form.recipient_driver_id) {
      toast({ title: "Select a recipient for direct messages", variant: "destructive" }); return;
    }

    if (form.message_type === "broadcast" || form.message_type === "announcement" || form.message_type === "safety_notice") {
      // Send to all drivers
      const rows = drivers.map(d => ({
        organization_id: organizationId,
        sender_id: user?.id,
        recipient_driver_id: d.id,
        subject: form.subject,
        body: form.body,
        message_type: form.message_type,
        priority: form.priority,
      }));
      await supabase.from("driver_messages").insert(rows);
    } else {
      await supabase.from("driver_messages").insert({
        organization_id: organizationId,
        sender_id: user?.id,
        recipient_driver_id: form.recipient_driver_id || null,
        subject: form.subject,
        body: form.body,
        message_type: form.message_type,
        priority: form.priority,
      });
    }

    toast({ title: "Message sent" });
    setShowCompose(false);
    setForm({ recipient_driver_id: "", subject: "", body: "", message_type: "direct", priority: "normal" });
    fetchMessages();
  };

  const getDriver = (id: string | null) => id ? drivers.find(d => d.id === id) : null;

  const filtered = activeTab === "all" ? messages :
    activeTab === "unread" ? messages.filter(m => !m.is_read) :
    messages.filter(m => m.message_type === activeTab);

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Messages", value: messages.length, icon: MessageSquare, color: "text-primary" },
          { label: "Unread", value: unreadCount, icon: Mail, color: "text-amber-400" },
          { label: "Announcements", value: messages.filter(m => m.message_type === "announcement" || m.message_type === "broadcast").length, icon: Megaphone, color: "text-blue-400" },
          { label: "Alerts", value: messages.filter(m => m.message_type === "alert" || m.message_type === "safety_notice").length, icon: AlertCircle, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread {unreadCount > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">{unreadCount}</Badge>}</TabsTrigger>
            <TabsTrigger value="direct">Direct</TabsTrigger>
            <TabsTrigger value="announcement">Announcements</TabsTrigger>
            <TabsTrigger value="alert">Alerts</TabsTrigger>
          </TabsList>
        </Tabs>
        <Dialog open={showCompose} onOpenChange={setShowCompose}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Compose</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Compose Message</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.message_type} onValueChange={v => setForm(p => ({ ...p, message_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["low", "normal", "high", "urgent"].map(p => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.message_type === "direct" && (
                <div>
                  <Label>Recipient</Label>
                  <Select value={form.recipient_driver_id} onValueChange={v => setForm(p => ({ ...p, recipient_driver_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select driver..." /></SelectTrigger>
                    <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {(form.message_type === "broadcast" || form.message_type === "announcement" || form.message_type === "safety_notice") && (
                <div className="p-2 rounded bg-primary/10 text-xs text-primary">
                  This will be sent to all {drivers.length} drivers.
                </div>
              )}
              <div>
                <Label>Subject</Label>
                <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Message subject" />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={4} placeholder="Write your message..." />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={sendMessage} className="gap-2"><Send className="w-4 h-4" /> Send</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map(msg => {
              const recipient = getDriver(msg.recipient_driver_id);
              const typeInfo = TYPE_CONFIG[msg.message_type] || TYPE_CONFIG.direct;
              const priorityInfo = PRIORITY_CONFIG[msg.priority] || PRIORITY_CONFIG.normal;
              return (
                <div key={msg.id} className={`flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors ${!msg.is_read ? "bg-primary/5" : ""}`}>
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <typeInfo.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{msg.subject}</span>
                      {!msg.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      <Badge variant="outline" className={`text-[10px] ${priorityInfo.color}`}>{msg.priority}</Badge>
                      <Badge variant="outline" className="text-[10px]">{typeInfo.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{msg.body}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>{format(new Date(msg.created_at), "MMM d, yyyy HH:mm")}</span>
                      {recipient && (
                        <span className="flex items-center gap-1">
                          → {recipient.first_name} {recipient.last_name}
                        </span>
                      )}
                      {msg.is_read && <span className="flex items-center gap-0.5"><CheckCheck className="w-3 h-3" /> Read</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No messages found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

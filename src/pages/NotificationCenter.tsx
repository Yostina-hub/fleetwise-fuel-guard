import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCircle, AlertTriangle, Info, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const NotificationCenter = () => {
  const { organizationId } = useOrganization();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notification-center", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("notification_center")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const unread = notifications.filter((n: any) => !n.is_read);
  const high = notifications.filter((n: any) => n.priority === "high" || n.priority === "urgent");

  const typeIcon = (type: string) => {
    switch (type) { case "warning": return <AlertTriangle className="h-4 w-4 text-orange-500" />; case "error": return <AlertTriangle className="h-4 w-4 text-destructive" />; case "success": return <CheckCircle className="h-4 w-4 text-green-500" />; default: return <Info className="h-4 w-4 text-blue-500" />; }
  };

  const renderList = (items: any[]) => (
    <div className="space-y-2">
      {items.length === 0 ? <p className="text-center text-muted-foreground py-8">No notifications</p> :
      items.map((n: any) => (
        <Card key={n.id} className={`cursor-pointer transition-colors ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}>
          <CardContent className="py-3 flex items-start gap-3">
            {typeIcon(n.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`font-medium text-sm ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM dd, HH:mm")}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{n.message}</p>
            </div>
            {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Notification Center</h1><p className="text-muted-foreground">Centralized notifications and alerts hub</p></div>
          <Button variant="outline">Mark All Read</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Bell className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{notifications.length}</p><p className="text-sm text-muted-foreground">Total</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Mail className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{unread.length}</p><p className="text-sm text-muted-foreground">Unread</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{high.length}</p><p className="text-sm text-muted-foreground">High Priority</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList><TabsTrigger value="all">All ({notifications.length})</TabsTrigger><TabsTrigger value="unread">Unread ({unread.length})</TabsTrigger><TabsTrigger value="high">High Priority ({high.length})</TabsTrigger></TabsList>
          <TabsContent value="all">{isLoading ? <p className="text-center py-8">Loading...</p> : renderList(notifications)}</TabsContent>
          <TabsContent value="unread">{renderList(unread)}</TabsContent>
          <TabsContent value="high">{renderList(high)}</TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default NotificationCenter;

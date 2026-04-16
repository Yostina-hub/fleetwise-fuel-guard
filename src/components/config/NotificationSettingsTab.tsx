import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";

interface NotificationSettingsTabProps {
  getVal: (category: string, key: string) => any;
  saveSetting: (category: string, key: string, value: any) => void;
}

const NotificationSettingsTab = ({ getVal, saveSetting }: NotificationSettingsTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notification Channels
          </CardTitle>
          <CardDescription>Configure how and when notifications are delivered</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 max-w-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                </div>
              </div>
              <Switch
                checked={getVal("notifications", "email_enabled")}
                onCheckedChange={v => saveSetting("notifications", "email_enabled", v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">SMS Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive critical alerts via SMS</p>
                </div>
              </div>
              <Switch
                checked={getVal("notifications", "sms_enabled")}
                onCheckedChange={v => saveSetting("notifications", "sms_enabled", v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Browser push notifications</p>
                </div>
              </div>
              <Switch
                checked={getVal("notifications", "push_enabled")}
                onCheckedChange={v => saveSetting("notifications", "push_enabled", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Preferences</CardTitle>
          <CardDescription>Control alert frequency and quiet hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Alert Digest Interval</Label>
            <Select
              value={getVal("notifications", "alert_digest_interval") || "realtime"}
              onValueChange={v => saveSetting("notifications", "alert_digest_interval", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time (Instant)</SelectItem>
                <SelectItem value="5min">Every 5 minutes</SelectItem>
                <SelectItem value="15min">Every 15 minutes</SelectItem>
                <SelectItem value="hourly">Hourly Digest</SelectItem>
                <SelectItem value="daily">Daily Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Quiet Hours</Label>
              <p className="text-xs text-muted-foreground">Suppress non-critical alerts during off hours</p>
            </div>
            <Switch
              checked={getVal("notifications", "quiet_hours_enabled") || false}
              onCheckedChange={v => saveSetting("notifications", "quiet_hours_enabled", v)}
            />
          </div>

          {getVal("notifications", "quiet_hours_enabled") && (
            <div className="flex items-center gap-4">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">From</Label>
                <Input
                  type="time"
                  defaultValue={getVal("notifications", "quiet_hours_start") || "22:00"}
                  onBlur={e => saveSetting("notifications", "quiet_hours_start", e.target.value)}
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">To</Label>
                <Input
                  type="time"
                  defaultValue={getVal("notifications", "quiet_hours_end") || "06:00"}
                  onBlur={e => saveSetting("notifications", "quiet_hours_end", e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>Sound Alerts</Label>
              <p className="text-xs text-muted-foreground">Play sound for critical alerts</p>
            </div>
            <Switch
              checked={getVal("notifications", "sound_enabled") ?? true}
              onCheckedChange={v => saveSetting("notifications", "sound_enabled", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettingsTab;

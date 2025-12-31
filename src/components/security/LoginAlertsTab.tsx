import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, AlertTriangle, MapPin, Smartphone, Clock, 
  Shield, CheckCircle, XCircle, Save, Trash2, Globe 
} from "lucide-react";
import { loginAlerts, type LoginAlertConfig, type LoginEvent } from "@/lib/security/loginAlerts";
import { useAuth } from "@/hooks/useAuth";

const LoginAlertsTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [config, setConfig] = useState<LoginAlertConfig>(loginAlerts.getConfig());
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<LoginEvent[]>([]);
  const [stats, setStats] = useState(loginAlerts.getStatistics(user?.id || ""));

  useEffect(() => {
    if (user?.id) {
      setHistory(loginAlerts.getLoginHistory(user.id));
      setPendingAlerts(loginAlerts.getPendingAlerts(user.id));
      setStats(loginAlerts.getStatistics(user.id));
    }
  }, [user?.id]);

  const handleSave = () => {
    loginAlerts.setConfig(config);
    toast({
      title: "Settings Saved",
      description: "Login alert configuration updated successfully.",
    });
  };

  const handleDismissAlert = (alertId: string) => {
    loginAlerts.dismissAlert(alertId);
    setPendingAlerts(loginAlerts.getPendingAlerts(user?.id || ""));
  };

  const handleDismissAll = () => {
    if (user?.id) {
      loginAlerts.dismissAllAlerts(user.id);
      setPendingAlerts([]);
    }
  };

  const getRiskBadge = (level: LoginEvent["riskLevel"]) => {
    switch (level) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalLogins}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.successfulLogins}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{stats.failedLogins}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.uniqueDevices}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.highRiskEvents}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Alerts */}
      {pendingAlerts.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-yellow-600" />
                <CardTitle>Pending Alerts ({pendingAlerts.length})</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleDismissAll}>
                Dismiss All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between p-3 bg-background rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getRiskBadge(alert.riskLevel)}
                      <span className="text-sm text-muted-foreground">
                        {formatDate(alert.timestamp)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {alert.alerts.map((a, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {a}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {alert.ipAddress}
                      </span>
                      {alert.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {alert.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismissAlert(alert.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle>Login History</CardTitle>
          <CardDescription>Recent login attempts for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm">{formatDate(event.timestamp)}</TableCell>
                    <TableCell>
                      {event.success ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getRiskBadge(event.riskLevel)}</TableCell>
                    <TableCell className="font-mono text-sm">{event.ipAddress}</TableCell>
                    <TableCell className="text-sm">{event.deviceInfo}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {event.isNewDevice && (
                          <Badge variant="outline" className="text-xs">
                            <Smartphone className="h-3 w-3 mr-1" />
                            New Device
                          </Badge>
                        )}
                        {event.isNewLocation && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            New Location
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No login history found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Alert Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Configuration</CardTitle>
          <CardDescription>Configure when to receive security alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Alert on New Device</Label>
                <p className="text-xs text-muted-foreground">
                  Notify when logging in from unrecognized device
                </p>
              </div>
              <Switch
                checked={config.alertOnNewDevice}
                onCheckedChange={(checked) => setConfig({ ...config, alertOnNewDevice: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Alert on New Location</Label>
                <p className="text-xs text-muted-foreground">
                  Notify when logging in from new geographic location
                </p>
              </div>
              <Switch
                checked={config.alertOnNewLocation}
                onCheckedChange={(checked) => setConfig({ ...config, alertOnNewLocation: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Alert on Multiple Failures</Label>
                <p className="text-xs text-muted-foreground">
                  Notify after {config.failureThreshold} failed attempts
                </p>
              </div>
              <Switch
                checked={config.alertOnMultipleFailures}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, alertOnMultipleFailures: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Alert on Unusual Time</Label>
                <p className="text-xs text-muted-foreground">
                  Notify for logins between {config.unusualTimeStart}:00 - {config.unusualTimeEnd}:00
                </p>
              </div>
              <Switch
                checked={config.alertOnUnusualTime}
                onCheckedChange={(checked) => setConfig({ ...config, alertOnUnusualTime: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Alert on VPN/Proxy</Label>
                <p className="text-xs text-muted-foreground">
                  Notify when VPN or proxy is detected
                </p>
              </div>
              <Switch
                checked={config.alertOnVpnProxy}
                onCheckedChange={(checked) => setConfig({ ...config, alertOnVpnProxy: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>In-App Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Show alerts in the application
                </p>
              </div>
              <Switch
                checked={config.inAppAlerts}
                onCheckedChange={(checked) => setConfig({ ...config, inAppAlerts: checked })}
              />
            </div>
          </div>

          {config.alertOnMultipleFailures && (
            <div className="space-y-2">
              <Label>Failure Threshold</Label>
              <Input
                type="number"
                min={2}
                max={10}
                value={config.failureThreshold}
                onChange={(e) =>
                  setConfig({ ...config, failureThreshold: parseInt(e.target.value) || 3 })
                }
                className="max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Number of failed attempts before alerting
              </p>
            </div>
          )}

          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginAlertsTab;

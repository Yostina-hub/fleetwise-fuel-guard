import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, AlertTriangle, CheckCircle, Shield, Save } from "lucide-react";
import { passwordExpiry, type PasswordExpiryConfig } from "@/lib/security/passwordExpiry";
import { useAuth } from "@/hooks/useAuth";

const PasswordExpiryTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [config, setConfig] = useState<PasswordExpiryConfig>(passwordExpiry.getConfig());
  const [userExpiry, setUserExpiry] = useState(passwordExpiry.checkExpiry(user?.id || ""));
  const [stats, setStats] = useState(passwordExpiry.getStatistics());

  useEffect(() => {
    if (user?.id) {
      setUserExpiry(passwordExpiry.checkExpiry(user.id));
    }
    setStats(passwordExpiry.getStatistics());
  }, [user?.id]);

  const handleSave = () => {
    passwordExpiry.setConfig(config);
    toast({
      title: "Settings Saved",
      description: "Password expiry configuration updated successfully.",
    });
  };

  const handleResetPassword = () => {
    if (user?.id) {
      passwordExpiry.recordPasswordChange(user.id);
      setUserExpiry(passwordExpiry.checkExpiry(user.id));
      toast({
        title: "Password Reset Recorded",
        description: "Your password expiry has been reset.",
      });
    }
  };

  const getExpiryProgress = () => {
    if (userExpiry.daysUntilExpiry >= config.expiryDays) return 100;
    return (userExpiry.daysUntilExpiry / config.expiryDays) * 100;
  };

  const getExpiryColor = () => {
    if (userExpiry.isExpired) return "bg-destructive";
    if (userExpiry.isWarning) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Password Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Days until expiry</span>
                <span className="text-lg font-bold">
                  {userExpiry.isExpired ? "Expired" : `${userExpiry.daysUntilExpiry} days`}
                </span>
              </div>
              <Progress value={getExpiryProgress()} className={getExpiryColor()} />
              <div className="flex items-center gap-2">
                {userExpiry.isExpired ? (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Password Expired
                  </Badge>
                ) : userExpiry.isWarning ? (
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    <Clock className="h-3 w-3 mr-1" />
                    Expiring Soon
                  </Badge>
                ) : (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Valid
                  </Badge>
                )}
              </div>
              {userExpiry.message && (
                <p className="text-sm text-muted-foreground">{userExpiry.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{stats.expiredCount}</p>
            <p className="text-xs text-muted-foreground">Users need reset</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.warningCount}</p>
            <p className="text-xs text-muted-foreground">Within warning period</p>
          </CardContent>
        </Card>
      </div>

      {/* Grace Logins */}
      {userExpiry.isExpired && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Password Expired
            </CardTitle>
            <CardDescription>
              Your password has expired. You have {userExpiry.graceLoginsRemaining} grace login(s)
              remaining before you must change your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleResetPassword}>
              Change Password Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Password Expiry Policy</CardTitle>
          <CardDescription>
            Configure password rotation requirements for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Enforce Password Expiry</Label>
              <p className="text-sm text-muted-foreground">
                Require users to change passwords periodically
              </p>
            </div>
            <Switch
              checked={config.enforceExpiry}
              onCheckedChange={(checked) => setConfig({ ...config, enforceExpiry: checked })}
            />
          </div>

          {config.enforceExpiry && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Password Expiry (days)</Label>
                <Input
                  type="number"
                  min={30}
                  max={365}
                  value={config.expiryDays}
                  onChange={(e) =>
                    setConfig({ ...config, expiryDays: parseInt(e.target.value) || 90 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Passwords must be changed after this many days
                </p>
              </div>

              <div className="space-y-2">
                <Label>Warning Period (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={config.warningDays}
                  onChange={(e) =>
                    setConfig({ ...config, warningDays: parseInt(e.target.value) || 14 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Start warning users this many days before expiry
                </p>
              </div>

              <div className="space-y-2">
                <Label>Grace Logins</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={config.graceLogins}
                  onChange={(e) =>
                    setConfig({ ...config, graceLogins: parseInt(e.target.value) || 3 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Allow this many logins after password expires
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Exclude Administrators</Label>
                  <p className="text-xs text-muted-foreground">
                    Admin accounts exempt from expiry
                  </p>
                </div>
                <Switch
                  checked={config.excludeAdmins}
                  onCheckedChange={(checked) => setConfig({ ...config, excludeAdmins: checked })}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Policy
            </Button>
            <Button variant="outline" onClick={handleResetPassword}>
              Reset My Password Timer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expiry Timeline Preview */}
      {config.enforceExpiry && (
        <Card>
          <CardHeader>
            <CardTitle>Policy Timeline</CardTitle>
            <CardDescription>Visual representation of the password lifecycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative pt-6 pb-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="bg-green-500"
                  style={{
                    width: `${((config.expiryDays - config.warningDays) / config.expiryDays) * 100}%`,
                  }}
                />
                <div
                  className="bg-yellow-500"
                  style={{
                    width: `${(config.warningDays / config.expiryDays) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Day 0 (Password Set)</span>
                <span>Day {config.expiryDays - config.warningDays} (Warning Starts)</span>
                <span>Day {config.expiryDays} (Expired)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PasswordExpiryTab;

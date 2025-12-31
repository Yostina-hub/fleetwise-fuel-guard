import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Shield, AlertTriangle, Save } from "lucide-react";
import { progressiveDelay, type DelayConfig } from "@/lib/security/progressiveDelay";

const ProgressiveDelayTab = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<DelayConfig>(progressiveDelay.getConfig());
  const [stats, setStats] = useState(progressiveDelay.getStatistics());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(progressiveDelay.getStatistics());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    progressiveDelay.setConfig(config);
    toast({
      title: "Settings Saved",
      description: "Progressive delay configuration updated successfully.",
    });
  };

  const handleClear = () => {
    progressiveDelay.clear();
    setStats(progressiveDelay.getStatistics());
    toast({
      title: "Cleared",
      description: "All delay records have been cleared.",
    });
  };

  const baseDelayOptions = [
    { value: "500", label: "0.5 seconds" },
    { value: "1000", label: "1 second" },
    { value: "2000", label: "2 seconds" },
    { value: "3000", label: "3 seconds" },
    { value: "5000", label: "5 seconds" },
  ];

  const maxDelayOptions = [
    { value: "60000", label: "1 minute" },
    { value: "120000", label: "2 minutes" },
    { value: "300000", label: "5 minutes" },
    { value: "600000", label: "10 minutes" },
    { value: "900000", label: "15 minutes" },
    { value: "1800000", label: "30 minutes" },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Active Delays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalIdentifiers}</p>
            <p className="text-xs text-muted-foreground">Identifiers with delay</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              Locked Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{stats.lockedIdentifiers}</p>
            <p className="text-xs text-muted-foreground">Currently locked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Max Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{config.maxAttempts}</p>
            <p className="text-xs text-muted-foreground">Before lockout</p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Progressive Delay Configuration</CardTitle>
          <CardDescription>
            Configure exponential backoff for failed login attempts. Each failure increases the wait time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Base Delay (First failure)</Label>
              <Select
                value={config.baseDelayMs.toString()}
                onValueChange={(v) => setConfig({ ...config, baseDelayMs: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {baseDelayOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Wait time after first failed attempt
              </p>
            </div>

            <div className="space-y-2">
              <Label>Maximum Delay</Label>
              <Select
                value={config.maxDelayMs.toString()}
                onValueChange={(v) => setConfig({ ...config, maxDelayMs: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {maxDelayOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Maximum wait time before lockout
              </p>
            </div>

            <div className="space-y-2">
              <Label>Maximum Attempts Before Lockout</Label>
              <Input
                type="number"
                min={3}
                max={20}
                value={config.maxAttempts}
                onChange={(e) => setConfig({ ...config, maxAttempts: parseInt(e.target.value) || 10 })}
              />
              <p className="text-xs text-muted-foreground">
                Account locks after this many failed attempts
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reset After (hours)</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={config.resetAfterMs / 3600000}
                onChange={(e) => setConfig({ ...config, resetAfterMs: (parseInt(e.target.value) || 1) * 3600000 })}
              />
              <p className="text-xs text-muted-foreground">
                Attempts reset after this period of inactivity
              </p>
            </div>
          </div>

          {/* Delay Preview */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-3">Delay Progression Preview</h4>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: Math.min(config.maxAttempts, 8) }).map((_, i) => {
                const delay = Math.min(
                  config.baseDelayMs * Math.pow(2, i),
                  config.maxDelayMs
                );
                return (
                  <Badge key={i} variant="outline" className="text-xs">
                    Attempt {i + 1}: {delay < 60000 ? `${delay / 1000}s` : `${Math.round(delay / 60000)}m`}
                  </Badge>
                );
              })}
              {config.maxAttempts > 8 && (
                <Badge variant="outline" className="text-xs">
                  ...and {config.maxAttempts - 8} more
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Clear All Delays
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressiveDelayTab;

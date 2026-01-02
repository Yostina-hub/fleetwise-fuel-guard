import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  Users,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface LockedAccount {
  id: string;
  email: string;
  lockedAt: string;
  reason: string;
  attempts: number;
  unlockAt?: string;
}

interface LockoutPolicy {
  enabled: boolean;
  maxAttempts: number;
  lockoutDurationMinutes: number;
  progressiveLockout: boolean;
  notifyOnLockout: boolean;
  autoUnlock: boolean;
}

export const AccountLockoutPanel = () => {
  const [policy, setPolicy] = useState<LockoutPolicy>({
    enabled: true,
    maxAttempts: 5,
    lockoutDurationMinutes: 30,
    progressiveLockout: true,
    notifyOnLockout: true,
    autoUnlock: true,
  });

  const [lockedAccounts] = useState<LockedAccount[]>([
    {
      id: '1',
      email: 'user1@example.com',
      lockedAt: '2024-01-15T10:30:00Z',
      reason: 'Too many failed login attempts',
      attempts: 5,
      unlockAt: '2024-01-15T11:00:00Z',
    },
    {
      id: '2',
      email: 'user2@example.com',
      lockedAt: '2024-01-15T09:15:00Z',
      reason: 'Suspicious activity detected',
      attempts: 8,
    },
  ]);

  const unlockAccount = (accountId: string) => {
    toast.success("Account unlocked successfully");
  };

  const unlockAllAccounts = () => {
    toast.success("All accounts unlocked");
  };

  const savePolicy = () => {
    toast.success("Lockout policy saved successfully");
  };

  return (
    <div className="space-y-6">
      {/* Policy Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
            Account Lockout Policy
          </CardTitle>
          <CardDescription>
            Configure automatic account lockout rules to prevent brute force attacks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Account Lockout</Label>
              <p className="text-sm text-muted-foreground">
                Automatically lock accounts after failed login attempts
              </p>
            </div>
            <Switch
              checked={policy.enabled}
              onCheckedChange={(enabled) => setPolicy({ ...policy, enabled })}
            />
          </div>

          {policy.enabled && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Maximum Failed Attempts: {policy.maxAttempts}</Label>
                  <Slider
                    value={[policy.maxAttempts]}
                    onValueChange={([value]) => setPolicy({ ...policy, maxAttempts: value })}
                    min={3}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Account will be locked after {policy.maxAttempts} failed attempts
                  </p>
                </div>

                <div>
                  <Label>Lockout Duration: {policy.lockoutDurationMinutes} minutes</Label>
                  <Slider
                    value={[policy.lockoutDurationMinutes]}
                    onValueChange={([value]) => setPolicy({ ...policy, lockoutDurationMinutes: value })}
                    min={5}
                    max={120}
                    step={5}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Progressive Lockout</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase lockout duration with each occurrence
                    </p>
                  </div>
                  <Switch
                    checked={policy.progressiveLockout}
                    onCheckedChange={(progressiveLockout) => 
                      setPolicy({ ...policy, progressiveLockout })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notify on Lockout</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notification when account is locked
                    </p>
                  </div>
                  <Switch
                    checked={policy.notifyOnLockout}
                    onCheckedChange={(notifyOnLockout) => 
                      setPolicy({ ...policy, notifyOnLockout })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Unlock</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically unlock after duration expires
                    </p>
                  </div>
                  <Switch
                    checked={policy.autoUnlock}
                    onCheckedChange={(autoUnlock) => 
                      setPolicy({ ...policy, autoUnlock })
                    }
                  />
                </div>
              </div>

              <Button onClick={savePolicy} className="w-full">
                Save Policy
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Locked Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-destructive" aria-hidden="true" />
                Locked Accounts
              </CardTitle>
              <CardDescription>
                {lockedAccounts.length} accounts currently locked
              </CardDescription>
            </div>
            {lockedAccounts.length > 0 && (
              <Button variant="outline" size="sm" onClick={unlockAllAccounts} aria-label="Unlock all locked accounts">
                <Unlock className="h-4 w-4 mr-2" aria-hidden="true" />
                Unlock All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lockedAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" role="status" aria-label="No locked accounts">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
              <p>No locked accounts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lockedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.email}</span>
                      <Badge variant="destructive" className="text-xs">
                        {account.attempts} attempts
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      {account.reason}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      Locked at: {new Date(account.lockedAt).toLocaleString()}
                      {account.unlockAt && (
                        <span className="ml-2">
                          • Auto-unlock: {new Date(account.unlockAt).toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unlockAccount(account.id)}
                    aria-label={`Unlock account ${account.email}`}
                  >
                    <Unlock className="h-4 w-4 mr-2" aria-hidden="true" />
                    Unlock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" aria-label="Lock a specific account">
            <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
            Lock Specific Account
          </Button>
          <Button variant="outline" className="w-full justify-start" aria-label="Reset failed attempt counters">
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Reset Failed Attempt Counters
          </Button>
          <Button variant="outline" className="w-full justify-start text-destructive" aria-label="Emergency lock all non-admin accounts">
            <ShieldAlert className="h-4 w-4 mr-2" aria-hidden="true" />
            Emergency: Lock All Non-Admin Accounts
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountLockoutPanel;

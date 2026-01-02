import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Monitor, Globe, Trash2, Shield, Save } from "lucide-react";
import { sessionManager, type SessionConfig, type SessionInfo } from "@/lib/security/sessionManagement";
import { useAuth } from "@/hooks/useAuth";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

const ITEMS_PER_PAGE = 10;

interface SessionsTableProps {
  sessions: SessionInfo[];
  onTerminateSession: (sessionId: string) => void;
  onTerminateOthers: () => void;
  getDeviceIcon: (deviceInfo: string) => React.ReactNode;
  formatDate: (date: Date) => string;
}

const SessionsTable = ({
  sessions,
  onTerminateSession,
  onTerminateOthers,
  getDeviceIcon,
  formatDate,
}: SessionsTableProps) => {
  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(
    sessions.length,
    ITEMS_PER_PAGE
  );

  const paginatedSessions = useMemo(() => {
    return sessions.slice(startIndex, endIndex);
  }, [sessions, startIndex, endIndex]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Sessions ({sessions.length})</CardTitle>
            <CardDescription>Manage your active login sessions across devices</CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button variant="outline" size="sm" onClick={onTerminateOthers}>
              Sign out other sessions
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4" role="status" aria-label="No active sessions">
            No active sessions found
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(session.deviceInfo)}
                        <span className="text-sm">{session.deviceInfo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{session.ipAddress}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                        <span className="text-sm">{session.location || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(session.lastActiveAt)}</TableCell>
                    <TableCell>
                      {session.isCurrent ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          Current
                        </Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!session.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTerminateSession(session.id)}
                          aria-label="Terminate this session"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sessions.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalItems={sessions.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const SessionManagementTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [config, setConfig] = useState<SessionConfig>(sessionManager.getConfig());
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [stats, setStats] = useState(sessionManager.getStatistics(user?.id || ""));

  useEffect(() => {
    if (user?.id) {
      setSessions(sessionManager.getUserSessions(user.id));
      setStats(sessionManager.getStatistics(user.id));
    }
  }, [user?.id]);

  const handleSave = () => {
    sessionManager.setConfig(config);
    toast({
      title: "Settings Saved",
      description: "Session management configuration updated successfully.",
    });
  };

  const handleTerminateSession = (sessionId: string) => {
    if (user?.id) {
      sessionManager.terminateSession(user.id, sessionId);
      setSessions(sessionManager.getUserSessions(user.id));
      setStats(sessionManager.getStatistics(user.id));
      toast({
        title: "Session Terminated",
        description: "The session has been logged out.",
      });
    }
  };

  const handleTerminateOthers = () => {
    if (user?.id) {
      const count = sessionManager.terminateOtherSessions(user.id);
      setSessions(sessionManager.getUserSessions(user.id));
      setStats(sessionManager.getStatistics(user.id));
      toast({
        title: "Sessions Terminated",
        description: `${count} other session(s) have been logged out.`,
      });
    }
  };

  const getDeviceIcon = (deviceInfo: string) => {
    const lower = deviceInfo.toLowerCase();
    if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) {
      return <Smartphone className="h-4 w-4" aria-hidden="true" />;
    }
    return <Monitor className="h-4 w-4" aria-hidden="true" />;
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.activeSessions}</p>
            <p className="text-xs text-muted-foreground">of {stats.maxAllowed} allowed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Max Allowed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{config.maxConcurrentSessions}</p>
            <p className="text-xs text-muted-foreground">Concurrent sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Session Timeout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{config.sessionTimeoutMinutes}</p>
            <p className="text-xs text-muted-foreground">Minutes of inactivity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Oldest Session</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {stats.oldestSession ? formatDate(stats.oldestSession) : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">Started</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions List */}
      <SessionsTable 
        sessions={sessions}
        onTerminateSession={handleTerminateSession}
        onTerminateOthers={handleTerminateOthers}
        getDeviceIcon={getDeviceIcon}
        formatDate={formatDate}
      />

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Session Policy Configuration</CardTitle>
          <CardDescription>
            Configure how concurrent sessions are handled across your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Maximum Concurrent Sessions</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={config.maxConcurrentSessions}
                onChange={(e) =>
                  setConfig({ ...config, maxConcurrentSessions: parseInt(e.target.value) || 3 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of simultaneous logins per user
              </p>
            </div>

            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={config.sessionTimeoutMinutes}
                onChange={(e) =>
                  setConfig({ ...config, sessionTimeoutMinutes: parseInt(e.target.value) || 60 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Inactive sessions expire after this duration
              </p>
            </div>

            <div className="space-y-2">
              <Label>On New Login (when limit reached)</Label>
              <Select
                value={config.enforceOnNewLogin}
                onValueChange={(v: "block" | "terminate_oldest" | "allow") =>
                  setConfig({ ...config, enforceOnNewLogin: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Block new login</SelectItem>
                  <SelectItem value="terminate_oldest">Terminate oldest session</SelectItem>
                  <SelectItem value="allow">Allow (no limit enforcement)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                What happens when a user exceeds the session limit
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Notify on New Session</Label>
                <p className="text-xs text-muted-foreground">
                  Alert users when a new session is started
                </p>
              </div>
              <Switch
                checked={config.notifyOnNewSession}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, notifyOnNewSession: checked })
                }
              />
            </div>
          </div>

          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" aria-hidden="true" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionManagementTab;

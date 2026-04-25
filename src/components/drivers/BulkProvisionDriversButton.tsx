import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound, Loader2, ShieldCheck, Download } from "lucide-react";

interface ResultRow {
  driverId: string;
  name: string;
  status: "created" | "skipped_has_account" | "error" | "dry_run";
  email?: string;
  userId?: string;
  error?: string;
}

export default function BulkProvisionDriversButton() {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("fleet.goffice.et");
  const [password, setPassword] = useState("ChangeMe!2026");
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    setResults(null);
    setSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "bulk-provision-drivers",
        {
          body: {
            emailDomain: domain.trim(),
            sharedPassword: password,
            dryRun,
          },
        }
      );
      if (error) throw error;
      setResults(data.results);
      setSummary(data.summary);
      toast.success(
        `${dryRun ? "Preview" : "Done"}: ${data.summary.created} created, ${data.summary.skipped} already had accounts, ${data.summary.errors} errors`
      );
    } catch (e: any) {
      toast.error(e?.message || "Bulk provisioning failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!results) return;
    const rows = [
      ["name", "email", "status", "user_id", "error"],
      ...results.map((r) => [
        r.name,
        r.email || "",
        r.status,
        r.userId || "",
        r.error || "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `driver-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <KeyRound className="h-4 w-4" />
        Bulk-Provision Drivers
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Bulk-Provision Driver Accounts
            </DialogTitle>
            <DialogDescription>
              Generate emails (firstname.lastname@domain) and create login
              accounts with the <code>driver</code> role for every driver who
              doesn't have one yet.
            </DialogDescription>
          </DialogHeader>

          {!results && (
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="bp-domain">Email domain</Label>
                <Input
                  id="bp-domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="fleet.goffice.et"
                />
              </div>
              <div>
                <Label htmlFor="bp-pass">Shared temporary password</Label>
                <Input
                  id="bp-pass"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Drivers should change this on first login. Min 8 chars.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bp-dry"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                <Label htmlFor="bp-dry" className="cursor-pointer">
                  Dry-run (preview emails without creating)
                </Label>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  Drivers with an existing user account will be skipped.
                  Missing emails will be auto-generated. The CSV output
                  contains every driver with their assigned email — share
                  credentials securely.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {results && summary && (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              <div className="flex gap-2 text-sm">
                <Badge variant="outline">Total: {summary.total}</Badge>
                <Badge className="bg-success/15 text-success border-success/30">
                  Created: {summary.created}
                </Badge>
                <Badge variant="secondary">Skipped: {summary.skipped}</Badge>
                {summary.errors > 0 && (
                  <Badge variant="destructive">Errors: {summary.errors}</Badge>
                )}
              </div>
              <ScrollArea className="flex-1 border rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Driver</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.driverId} className="border-t">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2 font-mono text-[11px]">
                          {r.email || "-"}
                        </td>
                        <td className="p-2">
                          {r.status === "created" && (
                            <Badge className="bg-success/15 text-success border-success/30">
                              created
                            </Badge>
                          )}
                          {r.status === "skipped_has_account" && (
                            <Badge variant="secondary">already exists</Badge>
                          )}
                          {r.status === "dry_run" && (
                            <Badge variant="outline">preview</Badge>
                          )}
                          {r.status === "error" && (
                            <Badge variant="destructive" title={r.error}>
                              error
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
              <Alert>
                <AlertDescription className="text-xs">
                  Temporary password for new accounts:{" "}
                  <code className="font-mono">{password}</code> — share via a
                  secure channel.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="gap-2">
            {results && (
              <Button variant="outline" onClick={downloadCsv} className="gap-2">
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setResults(null);
                setSummary(null);
              }}
            >
              Close
            </Button>
            {!results && (
              <Button onClick={run} disabled={loading || !password}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {dryRun ? "Preview" : "Provision Accounts"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

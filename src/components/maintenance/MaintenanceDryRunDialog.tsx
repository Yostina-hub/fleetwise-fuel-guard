/**
 * MaintenanceDryRunDialog
 *
 * Calls maintenance-auto-scheduler with { dry_run: true } and renders the
 * candidate work orders **without** committing them. Lets ops review which
 * vehicles would be ticketed (and which class overrides applied) before they
 * hit "Run Scheduler" for real.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FlaskConical, PlayCircle, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface DryItem {
  schedule_id: string;
  vehicle_id: string;
  license_plate: string | null;
  vehicle_type: string | null;
  service_type: string;
  priority: string;
  scheduled_date: string;
  reason: string;
  override_applied: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called when the user confirms "Run for real" so the parent can refresh. */
  onCommitted?: () => void;
}

export default function MaintenanceDryRunDialog({ open, onOpenChange, onCommitted }: Props) {
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [items, setItems] = useState<DryItem[]>([]);
  const [examined, setExamined] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  const runDry = async () => {
    setLoading(true);
    setHasRun(false);
    try {
      const { data, error } = await supabase.functions.invoke("maintenance-auto-scheduler", {
        body: { dry_run: true, organization_id: organizationId },
      });
      if (error) throw error;
      const d = data as any;
      setItems((d?.created_items as DryItem[]) ?? []);
      setExamined(d?.examined ?? 0);
      setSkipped(d?.skipped ?? 0);
      setHasRun(true);
    } catch (e: any) {
      toast.error(`Dry run failed: ${e.message ?? "unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    setCommitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("maintenance-auto-scheduler", {
        body: { dry_run: false, organization_id: organizationId, source: "dry-run-commit" },
      });
      if (error) throw error;
      const created = (data as any)?.created ?? 0;
      toast.success(
        created > 0
          ? `Created ${created} work order${created === 1 ? "" : "s"} from preview.`
          : "Nothing to create — schedules may have changed since the preview.",
      );
      onCommitted?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Run failed: ${e.message ?? "unknown error"}`);
    } finally {
      setCommitting(false);
    }
  };

  const overrideCount = items.filter((i) => i.override_applied).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" aria-hidden="true" />
            Auto-Scheduler Dry Run
          </DialogTitle>
          <DialogDescription>
            Preview the work orders the auto-scheduler would create right now. Nothing is written
            to the database until you click <em>Run for real</em>.
          </DialogDescription>
        </DialogHeader>

        {!hasRun ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <Sparkles className="w-10 h-10 text-primary" aria-hidden="true" />
            <p className="text-muted-foreground max-w-md">
              Click <strong>Run preview</strong> to see which schedules are due (with class
              overrides applied) before committing any work orders.
            </p>
            <Button onClick={runDry} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <PlayCircle className="w-4 h-4" aria-hidden="true" />
              )}
              Run preview
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">Schedules examined: {examined}</Badge>
              <Badge variant="default">Would create: {items.length}</Badge>
              <Badge variant="secondary">Skipped: {skipped}</Badge>
              {overrideCount > 0 && (
                <Badge variant="outline" className="border-primary text-primary">
                  {overrideCount} via class override
                </Badge>
              )}
            </div>

            <ScrollArea className="max-h-[420px] mt-3 rounded-md border">
              {items.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nothing to create — no schedules are due based on current rules and overrides.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={it.schedule_id}>
                        <TableCell className="font-medium">{it.license_plate ?? it.vehicle_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.vehicle_type ?? "—"}
                        </TableCell>
                        <TableCell>{it.service_type}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              it.priority === "critical" || it.priority === "high"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {it.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{it.scheduled_date}</TableCell>
                        <TableCell className="text-xs">
                          {it.reason}
                          {it.override_applied && (
                            <Badge variant="outline" className="ml-2 border-primary text-primary">
                              override
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={committing}>
            Close
          </Button>
          {hasRun && (
            <>
              <Button variant="outline" onClick={runDry} disabled={loading || committing}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
                Re-run preview
              </Button>
              <Button onClick={commit} disabled={committing || items.length === 0} className="gap-2">
                {committing ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <PlayCircle className="w-4 h-4" aria-hidden="true" />
                )}
                Run for real ({items.length})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

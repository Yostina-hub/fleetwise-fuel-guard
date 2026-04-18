/**
 * /forms/:id/submissions — view collected submissions for a form.
 *
 * Shows a table of submissions (most recent first) and a side panel that
 * renders the full data of the selected submission, resolving labels via
 * the form_version that was used at submit time.
 */
import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Inbox, Loader2, Download, FileText } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useForm, useFormSubmissions, useFormVersions } from "@/lib/forms/api";
import { walkFields, type BaseField } from "@/lib/forms/schema";

export default function FormSubmissions() {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formQ = useForm(formId);
  const subsQ = useFormSubmissions(formId);
  const versionsQ = useFormVersions(formId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const versionMap = useMemo(() => {
    const m = new Map<string, { version_number: number; fields: BaseField[] }>();
    for (const v of versionsQ.data ?? []) {
      const flat: BaseField[] = [];
      for (const { field } of walkFields(v.schema.fields)) flat.push(field);
      m.set(v.id, { version_number: v.version_number, fields: flat });
    }
    return m;
  }, [versionsQ.data]);

  const selected = useMemo(
    () => (subsQ.data ?? []).find((s) => s.id === selectedId) ?? null,
    [subsQ.data, selectedId],
  );

  const exportCsv = () => {
    if (!subsQ.data?.length) return;
    // Union of all field keys across submissions.
    const keys = new Set<string>(["submitted_at", "submitted_by"]);
    for (const s of subsQ.data) for (const k of Object.keys(s.data ?? {})) keys.add(k);
    const cols = Array.from(keys);
    const escape = (v: any) =>
      v == null ? "" : `"${String(typeof v === "object" ? JSON.stringify(v) : v).replace(/"/g, '""')}"`;
    const rows = [cols.join(",")];
    for (const s of subsQ.data) {
      const row = cols.map((c) => {
        if (c === "submitted_at") return escape(s.submitted_at);
        if (c === "submitted_by") return escape(s.submitted_by);
        return escape((s.data as any)?.[c]);
      });
      rows.push(row.join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formQ.data?.key ?? "form"}_submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (formQ.isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!formQ.data) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Form not found.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/forms")}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to forms
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{formQ.data.name}</h1>
              <Badge variant="outline" className="font-mono text-[10px]">{formQ.data.key}</Badge>
              <Badge variant="secondary" className="text-[10px]">
                {(subsQ.data?.length ?? 0)} submission{(subsQ.data?.length ?? 0) === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/forms/${formId}/edit`}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Open editor
              </Link>
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={!subsQ.data?.length}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 h-[calc(100vh-220px)] min-h-[500px]">
          <Card className="col-span-7 overflow-hidden">
            <ScrollArea className="h-full">
              {subsQ.isLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
                </div>
              ) : (subsQ.data ?? []).length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No submissions yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Submitted</th>
                      <th className="px-3 py-2">Version</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(subsQ.data ?? []).map((s) => {
                      const v = versionMap.get(s.form_version_id);
                      const isSel = selectedId === s.id;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setSelectedId(s.id)}
                          className={cn(
                            "border-t border-border cursor-pointer hover:bg-muted/30",
                            isSel && "bg-primary/10",
                          )}
                        >
                          <td className="px-3 py-2 text-xs">
                            {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}
                          </td>
                          <td className="px-3 py-2 text-xs font-mono">
                            v{v?.version_number ?? "?"}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {s.workflow_task_id ? (
                              <Badge variant="outline" className="text-[10px]">workflow</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">direct</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <Badge
                              variant={s.status === "submitted" ? "secondary" : "outline"}
                              className="text-[10px]"
                            >
                              {s.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </ScrollArea>
          </Card>

          <Card className="col-span-5 overflow-hidden">
            <ScrollArea className="h-full">
              {!selected ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  Select a submission to view its data.
                </div>
              ) : (
                <SubmissionDetail
                  data={selected.data ?? {}}
                  fields={versionMap.get(selected.form_version_id)?.fields ?? []}
                />
              )}
            </ScrollArea>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function SubmissionDetail({ data, fields }: { data: Record<string, any>; fields: BaseField[] }) {
  const known = new Set(fields.map((f) => f.key));
  return (
    <div className="p-4 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Submission data
      </div>
      <div className="space-y-2">
        {fields
          .filter((f) => !["section", "divider", "info_banner", "repeater"].includes(f.type))
          .map((f) => (
            <Row key={f.key} label={f.label} value={data[f.key]} />
          ))}
        {fields
          .filter((f) => f.type === "repeater")
          .map((f) => (
            <RepeaterRows key={f.key} field={f} rows={data[f.key]} />
          ))}
        {/* Unknown keys (older versions) */}
        {Object.keys(data ?? {})
          .filter((k) => !known.has(k))
          .map((k) => (
            <Row key={k} label={k} value={(data as any)[k]} mono />
          ))}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  const display =
    value == null || value === ""
      ? "—"
      : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return (
    <div className="flex items-start gap-3 text-xs border-b border-border/50 pb-1.5">
      <div className={cn("min-w-[140px] text-muted-foreground", mono && "font-mono")}>{label}</div>
      <div className="flex-1 break-words">{display}</div>
    </div>
  );
}

function RepeaterRows({ field, rows }: { field: BaseField; rows: any }) {
  const list: any[] = Array.isArray(rows) ? rows : [];
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-xs font-medium mb-1.5">{field.label}</div>
      {list.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">No rows</div>
      ) : (
        <div className="space-y-2">
          {list.map((r, i) => (
            <div key={i} className="rounded bg-muted/30 p-2">
              <div className="text-[10px] font-semibold text-muted-foreground mb-1">Row {i + 1}</div>
              {(field.fields ?? [])
                .filter((c) => !["section", "divider", "info_banner", "repeater"].includes(c.type))
                .map((c) => (
                  <Row key={c.key} label={c.label} value={r?.[c.key]} />
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

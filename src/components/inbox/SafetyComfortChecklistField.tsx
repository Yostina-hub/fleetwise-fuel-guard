// Inbox-side renderer for the Safety & Comfort standards checklist.
// Mirrors the WorkflowFieldset version but lives here so the Task Inbox
// (which has its own form renderer) can show it for SOP tasks.
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SAFETY_COMFORT_GROUPS,
  SAFETY_COMFORT_STANDARDS,
  CONDITION_OPTIONS,
  computeExpiry,
  type ChecklistValue,
  type SafetyComfortGroup,
} from "@/lib/workflow-engine/safetyComfortStandards";

interface Props {
  value: ChecklistValue | undefined;
  onChange: (next: ChecklistValue) => void;
}

export function SafetyComfortChecklistField({ value, onChange }: Props) {
  const cv: ChecklistValue = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
  const group = cv.group as SafetyComfortGroup | undefined;
  const items = cv.items || {};
  const sections = group ? SAFETY_COMFORT_STANDARDS[group] : [];

  const setGroup = (g: SafetyComfortGroup) => onChange({ group: g, items: {} });
  const setEntry = (
    k: string,
    patch: Partial<{ present: boolean; condition: string; notes: string; installed_at: string }>,
  ) => {
    const next = { ...items, [k]: { ...(items[k] || { present: false }), ...patch } };
    onChange({ group, items: next });
  };

  const totals = sections.reduce(
    (acc, s) => {
      s.items.forEach((it) => {
        acc.total += 1;
        const e = items[`${s.id}::${it.name}`];
        if (e?.present) acc.present += 1;
        if (e?.condition === "missing" || (e && !e.present)) acc.missing += 1;
        const exp = computeExpiry(e?.installed_at, it.usabilityMonths);
        if (exp?.expired) acc.expired += 1;
        else if (exp?.dueSoon) acc.dueSoon += 1;
      });
      return acc;
    },
    { total: 0, present: 0, missing: 0, expired: 0, dueSoon: 0 },
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 border border-input rounded-md p-3 bg-muted/30">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-[10px] uppercase">Vehicle Group</Label>
          <Select value={group || ""} onValueChange={(val) => setGroup(val as SafetyComfortGroup)}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a vehicle group to load its standard list" />
            </SelectTrigger>
            <SelectContent>
              {SAFETY_COMFORT_GROUPS.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {group && (
          <div className="text-xs text-muted-foreground space-x-2">
            <span><span className="font-semibold text-foreground">{totals.present}</span> present</span>·
            <span><span className="font-semibold text-destructive">{totals.missing}</span> missing</span>·
            <span><span className="font-semibold text-destructive">{totals.expired}</span> expired</span>·
            <span><span className="font-semibold text-warning">{totals.dueSoon}</span> due soon</span>·
            <span>{totals.total} total</span>
          </div>
        )}
      </div>

      {!group ? (
        <div className="border border-dashed border-input rounded-md p-4 text-xs text-muted-foreground text-center">
          Select a Vehicle Group above to load the standardized Safety &amp; Comfort checklist.
        </div>
      ) : (
        sections.map((section) => (
          <div key={section.id} className="border border-input rounded-md overflow-hidden">
            <div className="bg-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
              {section.label}
            </div>
            <div className="divide-y divide-input">
              {section.items.map((item) => {
                const k = `${section.id}::${item.name}`;
                const e = items[k] || { present: false };
                const exp = computeExpiry(e.installed_at, item.usabilityMonths);
                const expiryClass = exp?.expired
                  ? "text-destructive font-semibold"
                  : exp?.dueSoon
                  ? "text-warning font-semibold"
                  : "text-muted-foreground";
                return (
                  <div key={k} className="px-3 py-2 space-y-1">
                    <div className="grid grid-cols-1 md:grid-cols-[24px_1fr_140px_140px_1fr] gap-2 items-center">
                      <Checkbox
                        checked={!!e.present}
                        onCheckedChange={(c) => setEntry(k, { present: !!c })}
                      />
                      <span className="text-xs">{item.name}</span>
                      <Select
                        value={e.condition || ""}
                        onValueChange={(val) => setEntry(k, { condition: val })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Condition" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={e.installed_at || ""}
                        onChange={(ev) => setEntry(k, { installed_at: ev.target.value })}
                        title="Install / last replaced date"
                      />
                      <Input
                        className="h-8 text-xs"
                        placeholder="Notes (optional)"
                        value={e.notes || ""}
                        onChange={(ev) => setEntry(k, { notes: ev.target.value })}
                      />
                    </div>
                    <div className="text-[10px] flex flex-wrap gap-x-3 gap-y-0.5 pl-7">
                      <span className="text-muted-foreground">
                        Recommended: <span className="text-foreground">{item.usabilityLabel}</span>
                      </span>
                      <span className="text-muted-foreground italic">{item.remark}</span>
                      {exp && (
                        <span className={expiryClass}>
                          {exp.expired
                            ? `Expired ${Math.abs(exp.daysLeft)}d ago (exp ${exp.expiresOn.toISOString().slice(0, 10)})`
                            : `Expires in ${exp.daysLeft}d (${exp.expiresOn.toISOString().slice(0, 10)})`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

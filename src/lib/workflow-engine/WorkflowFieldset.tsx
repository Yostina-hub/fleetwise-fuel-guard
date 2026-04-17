// Shared form renderer for stage action fields & intake fields
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { StageField } from "./types";

interface Props {
  fields: StageField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function WorkflowFieldset({ fields, values, onChange }: Props) {
  const { organizationId } = useOrganization();

  const { data: vehicles = [] } = useQuery({
    queryKey: ["wf-vehicles", organizationId],
    enabled: !!organizationId && fields.some((f) => f.type === "vehicle"),
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("organization_id", organizationId!)
        .limit(500);
      return data || [];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["wf-drivers", organizationId],
    enabled: !!organizationId && fields.some((f) => f.type === "driver"),
    queryFn: async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, license_number")
        .eq("organization_id", organizationId!)
        .limit(500);
      return data || [];
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {fields.map((f) => {
        const v = values[f.key] ?? "";
        const wrap = (control: React.ReactNode) => (
          <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
            <Label className="text-xs">
              {f.label} {f.required ? <span className="text-destructive">*</span> : null}
            </Label>
            {control}
            {f.helpText ? (
              <p className="text-[10px] text-muted-foreground mt-1">{f.helpText}</p>
            ) : null}
          </div>
        );

        switch (f.type) {
          case "text":
          case "number":
          case "date":
          case "datetime":
            return wrap(
              <Input
                type={f.type === "datetime" ? "datetime-local" : f.type}
                value={v}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.key, e.target.value)}
              />,
            );
          case "textarea":
            return wrap(
              <Textarea
                value={v}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.key, e.target.value)}
              />,
            );
          case "checkbox":
            return wrap(
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  checked={!!v}
                  onCheckedChange={(c) => onChange(f.key, !!c)}
                />
                <span className="text-xs">{f.placeholder || f.label}</span>
              </div>,
            );
          case "select":
            return wrap(
              <Select value={v} onValueChange={(val) => onChange(f.key, val)}>
                <SelectTrigger>
                  <SelectValue placeholder={f.placeholder || "Select..."} />
                </SelectTrigger>
                <SelectContent>
                  {f.options?.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
            );
          case "vehicle":
            return wrap(
              <Select value={v} onValueChange={(val) => onChange(f.key, val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((veh: any) => (
                    <SelectItem key={veh.id} value={veh.id}>
                      {veh.plate_number} — {veh.make} {veh.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
            );
          case "driver":
            return wrap(
              <Select value={v} onValueChange={(val) => onChange(f.key, val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.first_name} {d.last_name} ({d.license_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
            );
          case "file":
            return wrap(
              <Input
                type="text"
                value={v}
                placeholder={f.placeholder || "Document URL or reference"}
                onChange={(e) => onChange(f.key, e.target.value)}
              />,
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

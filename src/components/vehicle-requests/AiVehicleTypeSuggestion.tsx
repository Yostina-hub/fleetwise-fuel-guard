/**
 * AiVehicleTypeSuggestion
 * ------------------------
 * Compact "Suggest with AI" affordance shown directly under the Vehicle Type
 * field in the Vehicle Request form. It calls the `suggest-vehicle-type`
 * edge function (Lovable AI / Gemini) with the current trip context and the
 * list of *eligible* vehicle types, then renders the model's pick + a one-
 * line rationale. The user can apply the suggestion with a single click.
 */
import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EligibleType {
  value: string;
  label: string;
}

interface Suggestion {
  vehicle_type: string;
  reason: string;
  confidence: "low" | "medium" | "high";
}

interface Props {
  /** Current form context — used as input to the AI. */
  context: {
    purpose?: string;
    purpose_category?: string;
    destination?: string;
    departure_place?: string;
    passengers?: number | null;
    cargo_load?: "none" | "small" | "medium" | "large" | null;
    cargo_weight_kg?: number | null;
    is_messenger?: boolean;
    rule_recommendation?: string | null;
  };
  /** Filter list — the AI can only choose from these. */
  eligibleTypes: EligibleType[];
  /** Currently chosen vehicle_type (for "already applied" hint). */
  currentValue?: string;
  /** Apply the suggestion to the form. */
  onApply: (vehicleType: string) => void;
  /** Disable the trigger when basic context isn't ready. */
  disabled?: boolean;
}

export function AiVehicleTypeSuggestion({
  context,
  eligibleTypes,
  currentValue,
  onApply,
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const ready =
    !disabled &&
    eligibleTypes.length > 0 &&
    !!(context.purpose && context.purpose.trim().length > 3);

  const labelFor = (value: string) =>
    eligibleTypes.find((e) => e.value === value)?.label || value;

  const requestSuggestion = async () => {
    setLoading(true);
    setSuggestion(null);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-vehicle-type", {
        body: {
          ...context,
          eligible_types: eligibleTypes,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSuggestion(data as Suggestion);
    } catch (e: any) {
      const msg = e?.message || "Could not get AI suggestion";
      if (msg.includes("Rate limit")) {
        toast.error("Too many requests — please wait a few seconds and try again.");
      } else if (msg.includes("credits")) {
        toast.error("AI credits exhausted. Add funds in your Lovable workspace.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!suggestion) {
    return (
      <div className="mt-1.5 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
          onClick={requestSuggestion}
          disabled={!ready || loading}
          title={
            !ready
              ? "Fill in purpose, passengers and cargo first"
              : "Get an AI-powered suggestion based on the trip context"
          }
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {loading ? "Thinking…" : "Suggest with AI"}
        </Button>
        {!ready && !loading && (
          <span className="text-[11px] text-muted-foreground">
            Add a purpose to enable AI suggestion
          </span>
        )}
      </div>
    );
  }

  const isApplied = currentValue === suggestion.vehicle_type;
  const confTone =
    suggestion.confidence === "high"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : suggestion.confidence === "medium"
      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
      : "bg-muted text-muted-foreground border-border";

  return (
    <div className="mt-1.5 rounded-md border border-primary/30 bg-primary/5 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-foreground">AI suggests:</span>
              <Badge variant="outline" className="text-xs h-5 border-primary/40 text-primary">
                {labelFor(suggestion.vehicle_type)}
              </Badge>
              <Badge variant="outline" className={`text-[10px] h-5 ${confTone}`}>
                {suggestion.confidence} confidence
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              {suggestion.reason}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSuggestion(null)}
          className="text-muted-foreground hover:text-foreground p-0.5 -mt-0.5 -mr-0.5"
          aria-label="Dismiss suggestion"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {isApplied ? (
          <Badge
            variant="outline"
            className="text-[11px] h-6 gap-1 border-emerald-500/40 text-emerald-600"
          >
            <CheckCircle2 className="w-3 h-3" /> Applied
          </Badge>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-6 px-2.5 text-xs gap-1"
            onClick={() => onApply(suggestion.vehicle_type)}
          >
            <CheckCircle2 className="w-3 h-3" /> Apply suggestion
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={requestSuggestion}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Re-suggest"}
        </Button>
      </div>
    </div>
  );
}

export default AiVehicleTypeSuggestion;

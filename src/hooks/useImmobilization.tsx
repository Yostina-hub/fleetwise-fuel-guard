import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";
import { friendlyToastError } from "@/lib/errorMessages";

export interface ImmobilizationSequence {
  id: string;
  organization_id: string;
  vehicle_id: string;
  trigger_type: 'unauthorized_movement' | 'geofence_breach';
  trigger_alert_id?: string;
  geofence_id?: string;
  sequence_status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  speed_steps: number[];
  current_step_index: number;
  step_interval_seconds: number;
  initiated_by?: string;
  initiated_at: string;
  cancelled_by?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ImmobilizationStep {
  id: string;
  sequence_id: string;
  organization_id: string;
  step_number: number;
  target_speed_kmh: number;
  device_command_id?: string;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed' | 'skipped';
  scheduled_at?: string;
  sent_at?: string;
  acknowledged_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export const useImmobilization = () => {
  const { organizationId } = useOrganization();
  const [sequences, setSequences] = useState<ImmobilizationSequence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSequences = useCallback(async () => {
    if (!organizationId) { setSequences([]); setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("immobilization_sequences")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSequences((data as any) || []);
    } catch (err: any) {
      console.error("Error fetching immobilization sequences:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchSequences();

    if (!organizationId) return;
    const channel = supabase
      .channel(`immob-${organizationId.slice(0, 8)}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'immobilization_sequences',
        filter: `organization_id=eq.${organizationId}`
      }, () => fetchSequences())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [organizationId, fetchSequences]);

  const initiateSequence = async (params: {
    vehicleId: string;
    triggerType: 'unauthorized_movement' | 'geofence_breach';
    triggerAlertId?: string;
    geofenceId?: string;
    speedSteps?: number[];
    stepIntervalSeconds?: number;
    notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organizationId) throw new Error("Not authenticated");

      const speedSteps = params.speedSteps || [80, 60, 40, 20, 0];

      const { data: seq, error: seqError } = await supabase
        .from("immobilization_sequences")
        .insert({
          organization_id: organizationId,
          vehicle_id: params.vehicleId,
          trigger_type: params.triggerType,
          trigger_alert_id: params.triggerAlertId || null,
          geofence_id: params.geofenceId || null,
          speed_steps: speedSteps,
          step_interval_seconds: params.stepIntervalSeconds || 30,
          initiated_by: user.id,
          notes: params.notes || null,
          sequence_status: 'in_progress',
        } as any)
        .select()
        .single();

      if (seqError) throw seqError;

      // Create individual steps
      const steps = speedSteps.map((speed, i) => ({
        sequence_id: (seq as any).id,
        organization_id: organizationId,
        step_number: i + 1,
        target_speed_kmh: speed,
        status: 'pending',
        scheduled_at: new Date(Date.now() + i * (params.stepIntervalSeconds || 30) * 1000).toISOString(),
      }));

      const { error: stepsError } = await supabase
        .from("immobilization_steps")
        .insert(steps as any);

      if (stepsError) throw stepsError;

      toast({ title: "Immobilization initiated", description: `Gradual speed reduction started: ${speedSteps.join(' → ')} km/h` });
      await fetchSequences();
      return true;
    } catch (err: any) {
      console.error("Error initiating immobilization:", err);
      friendlyToastError(err);
      return false;
    }
  };

  const cancelSequence = async (sequenceId: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("immobilization_sequences")
        .update({
          sequence_status: 'cancelled',
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason,
        } as any)
        .eq("id", sequenceId);

      if (error) throw error;

      // Skip remaining pending steps
      await supabase
        .from("immobilization_steps")
        .update({ status: 'skipped' } as any)
        .eq("sequence_id", sequenceId)
        .eq("status", "pending");

      toast({ title: "Immobilization cancelled", description: "Sequence has been stopped." });
      await fetchSequences();
      return true;
    } catch (err: any) {
      friendlyToastError(err);
      return false;
    }
  };

  const fetchSteps = async (sequenceId: string): Promise<ImmobilizationStep[]> => {
    const { data, error } = await supabase
      .from("immobilization_steps")
      .select("*")
      .eq("sequence_id", sequenceId)
      .order("step_number", { ascending: true });
    if (error) throw error;
    return (data as any) || [];
  };

  return { sequences, loading, initiateSequence, cancelSequence, fetchSteps, refetch: fetchSequences };
};

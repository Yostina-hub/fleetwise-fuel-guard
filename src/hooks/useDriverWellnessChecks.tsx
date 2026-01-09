import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

export interface WellnessCheck {
  id: string;
  organization_id: string;
  driver_id: string;
  vehicle_id: string | null;
  check_time: string;
  fatigue_level: number;
  hours_slept: number | null;
  sobriety_confirmed: boolean;
  feeling_well: boolean;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  is_fit_to_drive: boolean;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  driver?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  vehicle?: {
    id: string;
    plate_number: string;
    make: string;
    model: string;
  };
}

export interface WellnessCheckInput {
  driver_id: string;
  vehicle_id?: string | null;
  fatigue_level: number;
  hours_slept?: number | null;
  sobriety_confirmed: boolean;
  feeling_well: boolean;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export const useDriverWellnessChecks = (driverId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  // Fetch wellness checks for a specific driver or all in org
  const { data: wellnessChecks, isLoading } = useQuery({
    queryKey: ["wellness-checks", driverId, organizationId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("driver_wellness_checks")
        .select(`
          *,
          driver:driver_id (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          vehicle:vehicle_id (
            id,
            plate_number,
            make,
            model
          )
        `)
        .order("check_time", { ascending: false });

      if (driverId) {
        query = query.eq("driver_id", driverId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as WellnessCheck[];
    },
    enabled: !!organizationId,
  });

  // Get today's check for a driver
  const { data: todayCheck } = useQuery({
    queryKey: ["wellness-check-today", driverId],
    queryFn: async () => {
      if (!driverId) return null;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await (supabase as any)
        .from("driver_wellness_checks")
        .select("*")
        .eq("driver_id", driverId)
        .gte("check_time", today.toISOString())
        .order("check_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as WellnessCheck | null;
    },
    enabled: !!driverId,
  });

  // Submit a wellness check
  const submitCheck = useMutation({
    mutationFn: async (input: WellnessCheckInput) => {
      if (!organizationId) throw new Error("No organization");

      // Determine if fit to drive based on criteria
      const isFitToDrive = 
        input.fatigue_level <= 3 && 
        input.sobriety_confirmed && 
        input.feeling_well &&
        (input.hours_slept === null || input.hours_slept === undefined || input.hours_slept >= 6);

      let rejectionReason: string | null = null;
      if (!isFitToDrive) {
        const reasons: string[] = [];
        if (input.fatigue_level > 3) reasons.push("High fatigue level");
        if (!input.sobriety_confirmed) reasons.push("Sobriety not confirmed");
        if (!input.feeling_well) reasons.push("Not feeling well");
        if (input.hours_slept !== null && input.hours_slept !== undefined && input.hours_slept < 6) {
          reasons.push("Insufficient sleep");
        }
        rejectionReason = reasons.join(", ");
      }

      const { data, error } = await (supabase as any)
        .from("driver_wellness_checks")
        .insert({
          organization_id: organizationId,
          driver_id: input.driver_id,
          vehicle_id: input.vehicle_id || null,
          fatigue_level: input.fatigue_level,
          hours_slept: input.hours_slept || null,
          sobriety_confirmed: input.sobriety_confirmed,
          feeling_well: input.feeling_well,
          notes: input.notes || null,
          lat: input.lat || null,
          lng: input.lng || null,
          is_fit_to_drive: isFitToDrive,
          rejection_reason: rejectionReason,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WellnessCheck;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wellness-checks"] });
      queryClient.invalidateQueries({ queryKey: ["wellness-check-today"] });
      
      if (data.is_fit_to_drive) {
        toast({
          title: "Wellness Check Complete",
          description: "You are cleared to drive. Stay safe!",
        });
      } else {
        toast({
          title: "Not Cleared to Drive",
          description: data.rejection_reason || "Please speak with your supervisor.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Review a wellness check (supervisor)
  const reviewCheck = useMutation({
    mutationFn: async ({ 
      checkId, 
      isFitToDrive, 
      reviewNotes 
    }: { 
      checkId: string; 
      isFitToDrive: boolean; 
      reviewNotes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await (supabase as any)
        .from("driver_wellness_checks")
        .update({
          is_fit_to_drive: isFitToDrive,
          reviewed_by: userData.user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq("id", checkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wellness-checks"] });
      toast({
        title: "Review Saved",
        description: "Wellness check has been reviewed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    wellnessChecks,
    todayCheck,
    isLoading,
    submitCheck,
    reviewCheck,
  };
};

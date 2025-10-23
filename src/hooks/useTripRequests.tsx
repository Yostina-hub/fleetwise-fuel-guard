import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useTripRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading: loading } = useQuery({
    queryKey: ["trip-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_requests" as any)
        .select(`
          *,
          pickup_geofence:pickup_geofence_id(id, name),
          drop_geofence:drop_geofence_id(id, name),
          preferred_driver:preferred_driver_id(id, first_name, last_name),
          cost_center:cost_center_id(id, code, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any;
    },
  });

  const createRequest = useMutation({
    mutationFn: async (request: any) => {
      // Generate request number
      const { data: orgData } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const requestNumber = `TR-${Date.now().toString().slice(-8)}`;

      const { data, error } = await supabase
        .from("trip_requests" as any)
        .insert({
          ...request,
          organization_id: orgData?.organization_id,
          requester_id: (await supabase.auth.getUser()).data.user?.id,
          request_number: requestNumber,
        })
        .select()
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      toast({
        title: "Success",
        description: "Trip request created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from("trip_requests" as any)
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      toast({
        title: "Success",
        description: "Trip request submitted for approval",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    requests,
    loading,
    createRequest,
    submitRequest,
  };
};

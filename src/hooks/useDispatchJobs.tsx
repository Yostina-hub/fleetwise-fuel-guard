import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";
import { sendDispatchSms } from "@/services/smsNotificationService";

export interface DispatchJob {
  id: string;
  organization_id: string;
  job_number: string;
  job_type: string;
  status: 'pending' | 'dispatched' | 'en_route' | 'arrived' | 'completed' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  vehicle_id?: string;
  driver_id?: string;
  customer_name?: string;
  customer_phone?: string;
  pickup_location_name?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_geofence_id?: string;
  dropoff_location_name?: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  dropoff_geofence_id?: string;
  scheduled_pickup_at?: string;
  scheduled_dropoff_at?: string;
  actual_pickup_at?: string;
  actual_dropoff_at?: string;
  dispatched_at?: string;
  completed_at?: string;
  cargo_description?: string;
  cargo_weight_kg?: number;
  special_instructions?: string;
  sla_deadline_at?: string;
  sla_met?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DispatchPOD {
  id: string;
  organization_id: string;
  job_id: string;
  captured_at: string;
  captured_by?: string;
  recipient_name?: string;
  signature_url?: string;
  photo_urls?: string[];
  lat?: number;
  lng?: number;
  notes?: string;
  status?: string;
  created_at: string;
}

export const useDispatchJobs = (filters?: {
  status?: string;
  vehicleId?: string;
  driverId?: string;
}) => {
  const { organizationId } = useOrganization();
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    if (!organizationId) {
      setJobs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from("dispatch_jobs")
        .select("*")
        .eq("organization_id", organizationId);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters?.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }
      if (filters?.driverId) {
        query = query.eq("driver_id", filters.driverId);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setJobs((data as DispatchJob[]) || []);
    } catch (err: any) {
      console.error("Error fetching dispatch jobs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!organizationId) return;

    fetchJobs();

    let debounceTimer: NodeJS.Timeout;

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`dispatch-jobs-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dispatch_jobs',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fetchJobs, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId, filters?.status, filters?.vehicleId, filters?.driverId]);

  const lastJobCreateRef = useRef<number>(0);

  const createJob = async (job: Omit<DispatchJob, 'id' | 'organization_id' | 'job_number' | 'created_at' | 'updated_at'>) => {
    if (!organizationId) return null;

    // Finding #9: Prevent batch dispatch job creation
    const now = Date.now();
    if (now - lastJobCreateRef.current < 5000) {
      toast({ title: "Please Wait", description: "You can create a dispatch job every 5 seconds.", variant: "destructive" });
      return null;
    }
    lastJobCreateRef.current = now;

    try {
      // Generate a job number
      const jobNumber = `JOB-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from("dispatch_jobs")
        .insert([{
          job_number: jobNumber,
          job_type: job.job_type,
          status: job.status,
          priority: job.priority,
          vehicle_id: job.vehicle_id,
          driver_id: job.driver_id,
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          pickup_location_name: job.pickup_location_name,
          pickup_lat: job.pickup_lat,
          pickup_lng: job.pickup_lng,
          dropoff_location_name: job.dropoff_location_name,
          dropoff_lat: job.dropoff_lat,
          dropoff_lng: job.dropoff_lng,
          scheduled_pickup_at: job.scheduled_pickup_at,
          scheduled_dropoff_at: job.scheduled_dropoff_at,
          cargo_description: job.cargo_description,
          cargo_weight_kg: job.cargo_weight_kg,
          special_instructions: job.special_instructions,
          organization_id: organizationId,
        }])
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Job created", description: "Dispatch job created successfully" });
      fetchJobs();
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const updateJobStatus = async (id: string, status: DispatchJob['status'], additionalData?: Partial<DispatchJob>) => {
    try {
      const updateData: any = { status, ...additionalData };
      
      if (status === 'dispatched') {
        updateData.dispatched_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.actual_dropoff_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("dispatch_jobs")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Status updated", description: `Job marked as ${status}` });
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const assignJob = async (id: string, vehicleId: string, driverId: string, sendSmsNotification = true) => {
    try {
      // Get job details for SMS
      const job = jobs.find(j => j.id === id);
      
      const { error } = await supabase
        .from("dispatch_jobs")
        .update({
          vehicle_id: vehicleId,
          driver_id: driverId,
          status: 'dispatched',
          dispatched_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      
      // Send SMS notification to driver
      if (sendSmsNotification && job) {
        // Get driver details
        const { data: driver } = await supabase
          .from("drivers")
          .select("first_name, last_name, phone")
          .eq("id", driverId)
          .single();
        
        if (driver?.phone) {
          const smsResult = await sendDispatchSms({
            driverPhone: driver.phone,
            driverName: `${driver.first_name} ${driver.last_name}`,
            jobNumber: job.job_number,
            pickupLocation: job.pickup_location_name || 'See app',
            dropoffLocation: job.dropoff_location_name || 'See app',
            customerName: job.customer_name,
            specialInstructions: job.special_instructions,
          });
          
          if (smsResult.success) {
            toast({ 
              title: "Job assigned", 
              description: "Vehicle and driver assigned. SMS notification sent." 
            });
          } else {
            toast({ 
              title: "Job assigned", 
              description: `Assigned successfully. SMS failed: ${smsResult.error}`,
              variant: "default"
            });
          }
        } else {
          toast({ 
            title: "Job assigned", 
            description: "Vehicle and driver assigned. No phone number for SMS." 
          });
        }
      } else {
        toast({ title: "Job assigned", description: "Vehicle and driver assigned" });
      }
      
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const capturePOD = async (pod: Omit<DispatchPOD, 'id' | 'organization_id' | 'created_at'>) => {
    if (!organizationId) return null;

    try {
      const { data, error } = await supabase
        .from("dispatch_pod")
        .insert({
          ...pod,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: "POD captured", description: "Proof of delivery recorded" });
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  };

  return {
    jobs,
    loading,
    error,
    createJob,
    updateJobStatus,
    assignJob,
    capturePOD,
    refetch: fetchJobs,
  };
};

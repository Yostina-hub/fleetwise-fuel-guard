import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { compatibilityProfileSeeds, CompatibilityProfileSeed } from "@/data/deviceCompatibilityProfiles";
import type { Json } from "@/integrations/supabase/types";

export interface DeviceCompatibilityProfile {
  id: string;
  organization_id: string;
  vendor: string;
  model_name: string;
  protocol_name: string;
  supported_commands: string[];
  capabilities: Record<string, unknown>;
  telemetry_fields: string[];
  setup_config: Record<string, unknown>;
  command_templates: Record<string, unknown>;
  is_active: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useDeviceCompatibility = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["device_compatibility_profiles", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_compatibility_profiles")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .order("vendor", { ascending: true });

      if (error) throw error;
      return (data ?? []) as DeviceCompatibilityProfile[];
    },
    enabled: !!organizationId,
  });

  // Auto-seed profiles if none exist for this org
  const seededRef = useRef(false);
  useEffect(() => {
    if (!isLoading && profiles && profiles.length === 0 && organizationId && !seededRef.current) {
      seededRef.current = true;
      const rows = compatibilityProfileSeeds.map((s) => ({
        organization_id: organizationId,
        vendor: s.vendor,
        model_name: s.model_name,
        protocol_name: s.protocol_name,
        supported_commands: s.supported_commands,
        capabilities: s.capabilities as Json,
        telemetry_fields: s.telemetry_fields,
        setup_config: s.setup_config as Json,
        command_templates: s.command_templates as Json,
        is_active: true,
      }));
      supabase
        .from("device_compatibility_profiles")
        .upsert(rows, { onConflict: "organization_id,vendor,model_name", ignoreDuplicates: true })
        .then(({ error }) => {
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ["device_compatibility_profiles"] });
          }
        });
    }
  }, [isLoading, profiles, organizationId]);

  // Seed all built-in profiles for this org (idempotent)
  const seedProfiles = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");

      const rows = compatibilityProfileSeeds.map((s) => ({
        organization_id: organizationId,
        vendor: s.vendor,
        model_name: s.model_name,
        protocol_name: s.protocol_name,
        supported_commands: s.supported_commands,
        capabilities: s.capabilities as Json,
        telemetry_fields: s.telemetry_fields,
        setup_config: s.setup_config as Json,
        command_templates: s.command_templates as Json,
        is_active: true,
      }));

      const { error } = await supabase
        .from("device_compatibility_profiles")
        .upsert(rows, { onConflict: "organization_id,vendor,model_name", ignoreDuplicates: true });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device_compatibility_profiles"] });
      toast.success("Device profiles synced");
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync profiles: ${error.message}`);
    },
  });

  // Get profile for a specific device model
  const getProfileForModel = (vendor: string, model: string) => {
    return profiles?.find(
      (p) => p.vendor === vendor && p.model_name === model
    );
  };

  // Get profiles by protocol
  const getProfilesByProtocol = (protocol: string) => {
    return profiles?.filter((p) => p.protocol_name === protocol) ?? [];
  };

  // Check if a device supports a command
  const supportsCommand = (profileId: string, command: string): boolean => {
    const profile = profiles?.find((p) => p.id === profileId);
    return profile?.supported_commands?.includes(command) ?? false;
  };

  // Get command template for a profile
  const getCommandTemplate = (profileId: string, command: string) => {
    const profile = profiles?.find((p) => p.id === profileId);
    return (profile?.command_templates as Record<string, unknown>)?.[command];
  };

  return {
    profiles,
    isLoading,
    seedProfiles,
    getProfileForModel,
    getProfilesByProtocol,
    supportsCommand,
    getCommandTemplate,
    seeds: compatibilityProfileSeeds,
  };
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { deviceTemplates, DeviceTemplate } from "@/data/deviceTemplates";
import type { Json } from "@/integrations/supabase/types";

export interface DecoderConfig {
  port?: number;
  features?: string[];
  parameters?: string[];
  crc_enabled?: boolean;
  crc_type?: string;
  byte_order?: string;
  header_bytes?: string;
  tail_bytes?: string;
  [key: string]: Json | undefined;
}

export interface DeviceProtocol {
  id: string;
  organization_id: string;
  vendor: string;
  protocol_name: string;
  version: string | null;
  decoder_config: DecoderConfig;
  is_active: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProtocolData {
  vendor: string;
  protocol_name: string;
  version?: string;
  decoder_config: DecoderConfig;
  is_active?: boolean;
  notes?: string;
}

export const useDeviceProtocols = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const { data: protocols, isLoading, error } = useQuery({
    queryKey: ["device_protocols", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_protocols")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("vendor", { ascending: true });

      if (error) throw error;
      return data as DeviceProtocol[];
    },
    enabled: !!organizationId,
  });

  const createProtocol = useMutation({
    mutationFn: async (protocolData: CreateProtocolData) => {
      const { data, error } = await supabase
        .from("device_protocols")
        .insert([{
          organization_id: organizationId!,
          vendor: protocolData.vendor,
          protocol_name: protocolData.protocol_name,
          version: protocolData.version || null,
          decoder_config: protocolData.decoder_config as Json,
          is_active: protocolData.is_active ?? true,
          notes: protocolData.notes || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as DeviceProtocol;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device_protocols"] });
      toast.success("Protocol created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create protocol: ${error.message}`);
    },
  });

  const updateProtocol = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeviceProtocol> & { id: string }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.vendor !== undefined) updateData.vendor = updates.vendor;
      if (updates.protocol_name !== undefined) updateData.protocol_name = updates.protocol_name;
      if (updates.version !== undefined) updateData.version = updates.version;
      if (updates.decoder_config !== undefined) updateData.decoder_config = updates.decoder_config as Json;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error } = await supabase
        .from("device_protocols")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DeviceProtocol;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device_protocols"] });
      toast.success("Protocol updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update protocol: ${error.message}`);
    },
  });

  const deleteProtocol = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("device_protocols")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device_protocols"] });
      toast.success("Protocol deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete protocol: ${error.message}`);
    },
  });

  const createFromTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const template = deviceTemplates.find(t => t.id === templateId);
      if (!template) throw new Error("Template not found");

      const decoderConfig: DecoderConfig = {
        port: template.defaultPort,
        features: template.features,
        parameters: template.parameters,
        crc_enabled: true,
        crc_type: getCrcTypeForProtocol(template.protocol),
      };

      const { data, error } = await supabase
        .from("device_protocols")
        .insert([{
          organization_id: organizationId!,
          vendor: template.vendor,
          protocol_name: template.protocol,
          version: "1.0",
          decoder_config: decoderConfig as Json,
          is_active: true,
          notes: `Created from template: ${template.name}`,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as DeviceProtocol;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device_protocols"] });
      toast.success("Protocol created from template");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create protocol: ${error.message}`);
    },
  });

  // Create protocol from template and return the ID (for device creation flow)
  const createProtocolFromTemplateForDevice = async (template: DeviceTemplate): Promise<string> => {
    // Check if protocol already exists for this vendor/protocol combo
    const existing = protocols?.find(
      p => p.vendor === template.vendor && p.protocol_name === template.protocol
    );
    
    if (existing) {
      return existing.id;
    }

    const decoderConfig: DecoderConfig = {
      port: template.defaultPort,
      features: template.features,
      parameters: template.parameters,
      crc_enabled: true,
      crc_type: getCrcTypeForProtocol(template.protocol),
    };

    const { data, error } = await supabase
      .from("device_protocols")
      .insert([{
        organization_id: organizationId!,
        vendor: template.vendor,
        protocol_name: template.protocol,
        version: "1.0",
        decoder_config: decoderConfig as Json,
        is_active: true,
        notes: `Auto-created from template: ${template.name}`,
      }])
      .select()
      .single();

    if (error) throw error;
    
    queryClient.invalidateQueries({ queryKey: ["device_protocols"] });
    return data.id;
  };

  return {
    protocols,
    isLoading,
    error,
    createProtocol,
    updateProtocol,
    deleteProtocol,
    createFromTemplate,
    createProtocolFromTemplateForDevice,
    templates: deviceTemplates,
  };
};

function getCrcTypeForProtocol(protocol: string): string {
  const crcMap: Record<string, string> = {
    gt06: 'crc16_x25',
    tk103: 'xor',
    teltonika: 'crc16',
    queclink: 'crc16_ccitt',
    ruptela: 'crc16',
    h02: 'xor',
    calamp: 'crc32',
    meitrack: 'checksum',
    topflytech: 'crc16',
    omnicomm: 'crc16',
  };
  return crcMap[protocol.toLowerCase()] || 'none';
}

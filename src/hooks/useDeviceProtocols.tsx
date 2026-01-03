import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { deviceTemplates, DeviceTemplate } from "@/data/deviceTemplates";

export interface DeviceProtocol {
  id: string;
  organization_id: string;
  vendor: string;
  protocol_name: string;
  version: string | null;
  decoder_config: {
    port?: number;
    features?: string[];
    parameters?: string[];
    crc_enabled?: boolean;
    crc_type?: string;
    byte_order?: string;
    header_bytes?: string;
    tail_bytes?: string;
  };
  is_active: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProtocolData {
  vendor: string;
  protocol_name: string;
  version?: string;
  decoder_config: DeviceProtocol['decoder_config'];
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
        .insert({
          organization_id: organizationId!,
          vendor: protocolData.vendor,
          protocol_name: protocolData.protocol_name,
          version: protocolData.version || null,
          decoder_config: protocolData.decoder_config,
          is_active: protocolData.is_active ?? true,
          notes: protocolData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device_protocols"] });
      toast.success("Protocol created successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to create protocol: ${error.message}`);
    },
  });

  const updateProtocol = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeviceProtocol> & { id: string }) => {
      const { data, error } = await supabase
        .from("device_protocols")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device_protocols"] });
      toast.success("Protocol updated successfully");
    },
    onError: (error: any) => {
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
    onError: (error: any) => {
      toast.error(`Failed to delete protocol: ${error.message}`);
    },
  });

  const createFromTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const template = deviceTemplates.find(t => t.id === templateId);
      if (!template) throw new Error("Template not found");

      const { data, error } = await supabase
        .from("device_protocols")
        .insert({
          organization_id: organizationId!,
          vendor: template.vendor,
          protocol_name: template.protocol,
          version: "1.0",
          decoder_config: {
            port: template.defaultPort,
            features: template.features,
            parameters: template.parameters,
            crc_enabled: true,
            crc_type: getCrcTypeForProtocol(template.protocol),
          },
          is_active: true,
          notes: `Created from template: ${template.name}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device_protocols"] });
      toast.success("Protocol created from template");
    },
    onError: (error: any) => {
      toast.error(`Failed to create protocol: ${error.message}`);
    },
  });

  return {
    protocols,
    isLoading,
    error,
    createProtocol,
    updateProtocol,
    deleteProtocol,
    createFromTemplate,
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

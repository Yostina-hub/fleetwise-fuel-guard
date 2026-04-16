import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export function useTPLPartners() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tpl-partners", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tpl_partners")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createPartner = useMutation({
    mutationFn: async (partner: any) => {
      const { error } = await supabase.from("tpl_partners").insert({ ...partner, organization_id: organizationId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-partners"] }); toast.success("Partner created"); },
    onError: (e: any) => toast.error("Failed to create partner", { description: e.message }),
  });

  const updatePartner = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from("tpl_partners").update(data).eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-partners"] }); toast.success("Partner updated"); },
    onError: (e: any) => toast.error("Failed to update partner", { description: e.message }),
  });

  const deletePartner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tpl_partners").delete().eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-partners"] }); toast.success("Partner deleted"); },
    onError: (e: any) => toast.error("Failed to delete partner", { description: e.message }),
  });

  return { partners: query.data || [], isLoading: query.isLoading, createPartner, updatePartner, deletePartner };
}

export function useTPLShipments() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tpl-shipments", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tpl_shipments")
        .select("*, tpl_partners(name)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createShipment = useMutation({
    mutationFn: async (shipment: any) => {
      const shipmentNumber = `SHP-${Date.now().toString().slice(-8)}`;
      const { error } = await supabase.from("tpl_shipments").insert({ ...shipment, shipment_number: shipmentNumber, organization_id: organizationId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-shipments"] }); toast.success("Shipment created"); },
    onError: (e: any) => toast.error("Failed to create shipment", { description: e.message }),
  });

  const updateShipment = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from("tpl_shipments").update(data).eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-shipments"] }); toast.success("Shipment updated"); },
    onError: (e: any) => toast.error("Failed to update shipment", { description: e.message }),
  });

  const deleteShipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tpl_shipments").delete().eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-shipments"] }); toast.success("Shipment deleted"); },
    onError: (e: any) => toast.error("Failed to delete shipment", { description: e.message }),
  });

  return { shipments: query.data || [], isLoading: query.isLoading, createShipment, updateShipment, deleteShipment };
}

export function useTPLInvoices() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tpl-invoices", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tpl_invoices")
        .select("*, tpl_partners(name)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createInvoice = useMutation({
    mutationFn: async (invoice: any) => {
      const { error } = await supabase.from("tpl_invoices").insert({ ...invoice, organization_id: organizationId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-invoices"] }); toast.success("Invoice created"); },
    onError: (e: any) => toast.error("Failed to create invoice", { description: e.message }),
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from("tpl_invoices").update(data).eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-invoices"] }); toast.success("Invoice updated"); },
    onError: (e: any) => toast.error("Failed to update invoice", { description: e.message }),
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tpl_invoices").delete().eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-invoices"] }); toast.success("Invoice deleted"); },
    onError: (e: any) => toast.error("Failed to delete invoice", { description: e.message }),
  });

  return { invoices: query.data || [], isLoading: query.isLoading, createInvoice, updateInvoice, deleteInvoice };
}

export function useTPLRateCards() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tpl-rate-cards", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tpl_rate_cards")
        .select("*, tpl_partners(name)")
        .eq("organization_id", organizationId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createRateCard = useMutation({
    mutationFn: async (card: any) => {
      const { error } = await supabase.from("tpl_rate_cards").insert({ ...card, organization_id: organizationId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-rate-cards"] }); toast.success("Rate card created"); },
    onError: (e: any) => toast.error("Failed to create rate card", { description: e.message }),
  });

  const updateRateCard = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from("tpl_rate_cards").update(data).eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-rate-cards"] }); toast.success("Rate card updated"); },
    onError: (e: any) => toast.error("Failed to update rate card", { description: e.message }),
  });

  const deleteRateCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tpl_rate_cards").delete().eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-rate-cards"] }); toast.success("Rate card deleted"); },
    onError: (e: any) => toast.error("Failed to delete rate card", { description: e.message }),
  });

  return { rateCards: query.data || [], isLoading: query.isLoading, createRateCard, updateRateCard, deleteRateCard };
}

export function useTPLPerformance() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tpl-performance", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tpl_performance_metrics")
        .select("*, tpl_partners(name)")
        .eq("organization_id", organizationId!)
        .order("period_start", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMetric = useMutation({
    mutationFn: async (metric: any) => {
      const { error } = await supabase.from("tpl_performance_metrics").insert({ ...metric, organization_id: organizationId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tpl-performance"] }); toast.success("Metrics recorded"); },
    onError: (e: any) => toast.error("Failed to record metrics", { description: e.message }),
  });

  return { metrics: query.data || [], isLoading: query.isLoading, createMetric };
}

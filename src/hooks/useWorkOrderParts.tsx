import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface WorkOrderPart {
  id: string;
  organization_id: string;
  work_order_id: string;
  inventory_item_id?: string;
  part_number?: string;
  part_name: string;
  quantity: number;
  quantity_used?: number;
  unit_cost?: number;
  total_cost?: number;
  is_warranty?: boolean;
  created_at: string;
  inventory_item?: {
    part_name: string;
    part_number: string;
    current_quantity: number;
    unit_cost: number;
  };
}

export interface InventoryItem {
  id: string;
  part_number: string;
  part_name: string;
  category?: string;
  current_quantity: number;
  minimum_quantity?: number;
  unit_cost?: number;
  unit_of_measure?: string;
  location?: string;
  reorder_point?: number;
}

export const useWorkOrderParts = (workOrderId?: string) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  // Fetch parts for a specific work order
  const { data: parts, isLoading: partsLoading } = useQuery({
    queryKey: ['work-order-parts', workOrderId],
    queryFn: async () => {
      if (!workOrderId) return [];

      const { data, error } = await supabase
        .from('work_order_parts')
        .select(`
          *,
          inventory_item:inventory_items(part_name, part_number, current_quantity, unit_cost)
        `)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkOrderPart[];
    },
    enabled: !!workOrderId,
  });

  // Fetch available inventory items
  const { data: inventoryItems, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-items', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('organization_id', organizationId)
        .gt('current_quantity', 0)
        .order('part_name');

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!organizationId,
  });

  // Add part to work order
  const addPartMutation = useMutation({
    mutationFn: async (part: {
      work_order_id: string;
      inventory_item_id?: string;
      part_name: string;
      part_number?: string;
      quantity: number;
      unit_cost?: number;
      is_warranty?: boolean;
    }) => {
      if (!organizationId) throw new Error("No organization");

      const totalCost = (part.quantity || 0) * (part.unit_cost || 0);

      const { error } = await supabase
        .from('work_order_parts')
        .insert({
          organization_id: organizationId,
          work_order_id: part.work_order_id,
          inventory_item_id: part.inventory_item_id,
          part_name: part.part_name,
          part_number: part.part_number,
          quantity: part.quantity,
          quantity_used: part.quantity,
          unit_cost: part.unit_cost,
          total_cost: totalCost,
          is_warranty: part.is_warranty || false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-parts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({ title: "Part added", description: "Part added to work order" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add part", 
        variant: "destructive" 
      });
    },
  });

  // Remove part from work order
  const removePartMutation = useMutation({
    mutationFn: async (partId: string) => {
      const { error } = await supabase
        .from('work_order_parts')
        .delete()
        .eq('id', partId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-parts'] });
      toast({ title: "Part removed", description: "Part removed from work order" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to remove part", 
        variant: "destructive" 
      });
    },
  });

  // Calculate total parts cost
  const totalPartsCost = parts?.reduce((sum, p) => sum + (p.total_cost || 0), 0) || 0;

  return {
    parts: parts || [],
    inventoryItems: inventoryItems || [],
    loading: partsLoading || inventoryLoading,
    totalPartsCost,
    addPart: addPartMutation.mutate,
    removePart: removePartMutation.mutate,
    isAdding: addPartMutation.isPending,
    isRemoving: removePartMutation.isPending,
  };
};

// Hook for low stock alerts
export const useLowStockAlerts = () => {
  const { organizationId } = useOrganization();

  const { data: lowStockItems, isLoading } = useQuery({
    queryKey: ['low-stock-items', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('organization_id', organizationId)
        .or('current_quantity.lte.minimum_quantity,current_quantity.lte.reorder_point')
        .order('current_quantity', { ascending: true });

      if (error) throw error;
      
      // Filter in JS since the OR with column comparison doesn't work well
      return (data as InventoryItem[]).filter(
        item => item.current_quantity <= (item.minimum_quantity || item.reorder_point || 0)
      );
    },
    enabled: !!organizationId,
  });

  return {
    lowStockItems: lowStockItems || [],
    loading: isLoading,
    lowStockCount: lowStockItems?.length || 0,
  };
};

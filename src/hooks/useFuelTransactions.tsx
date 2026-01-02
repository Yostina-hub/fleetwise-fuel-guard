import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface FuelTransaction {
  id: string;
  organization_id: string;
  vehicle_id: string;
  transaction_type: string;
  transaction_date: string;
  fuel_amount_liters: number;
  fuel_cost?: number;
  fuel_price_per_liter?: number;
  odometer_km?: number;
  location_name?: string;
  lat?: number;
  lng?: number;
  card_number?: string;
  receipt_number?: string;
  vendor_name?: string;
  is_reconciled?: boolean;
  reconciled_at?: string;
  reconciled_by?: string;
  variance_liters?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useFuelTransactions = (filters?: {
  vehicleId?: string;
  transactionType?: string;
  isReconciled?: boolean;
}) => {
  const { organizationId } = useOrganization();
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchTransactions = useCallback(async () => {
    if (!organizationId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from("fuel_transactions")
        .select("*")
        .eq("organization_id", organizationId);

      if (filters?.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }
      if (filters?.transactionType) {
        query = query.eq("transaction_type", filters.transactionType);
      }
      if (filters?.isReconciled !== undefined) {
        query = query.eq("is_reconciled", filters.isReconciled);
      }

      const { data, error } = await query
        .order("transaction_date", { ascending: false })
        .limit(500);

      if (error) throw error;
      if (isMountedRef.current) {
        setTransactions((data as FuelTransaction[]) || []);
      }
    } catch (err: any) {
      console.error("Error fetching fuel transactions:", err);
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [organizationId, filters?.vehicleId, filters?.transactionType, filters?.isReconciled]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchTransactions();

    if (!organizationId) return;

    // Subscribe to realtime changes with debounce
    const channelName = `fuel-transactions-${organizationId.slice(0, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fuel_transactions',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          debounceRef.current = setTimeout(() => {
            fetchTransactions();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [organizationId, filters?.vehicleId, filters?.transactionType, filters?.isReconciled, fetchTransactions]);

  const createTransaction = async (transaction: Omit<FuelTransaction, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    if (!organizationId) return null;

    try {
      const { data, error } = await supabase
        .from("fuel_transactions")
        .insert({
          ...transaction,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Transaction created", description: "Fuel transaction recorded successfully" });
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const reconcileTransaction = async (id: string, variance: number, notes?: string) => {
    try {
      const { error } = await supabase
        .from("fuel_transactions")
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString(),
          variance_liters: variance,
          notes: notes,
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Reconciled", description: "Transaction marked as reconciled" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return {
    transactions,
    loading,
    error,
    createTransaction,
    reconcileTransaction,
    refetch: fetchTransactions,
  };
};

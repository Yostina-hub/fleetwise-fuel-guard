/**
 * iPROC adapter client wrapper.
 * Talks to the `iproc-adapter` edge function which acts as the single
 * facade for all ERP operations (mock today, real iPROC tomorrow).
 */
import { supabase } from "@/integrations/supabase/client";

export interface OnHandBalance {
  sku: string;
  tire_size: string;
  total_on_hand: number;
  warehouses: Array<{ warehouse: string; quantity: number; location?: string }>;
  last_updated: string;
  _mock?: boolean;
}

async function call<T>(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("iproc-adapter", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || `iPROC ${action} failed`);
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export const iproc = {
  lookupOnHand: (params: { tire_size: string; sku?: string }) =>
    call<OnHandBalance>("lookup_onhand", params),

  createMR: (tire_request_id: string) =>
    call<{ ok: boolean; iproc_mr_number: string }>("create_mr", { tire_request_id }),

  postReturn: (params: {
    request_item_id: string;
    warehouse?: string;
    received_by?: string;
    notes?: string;
  }) =>
    call<{ ok: boolean; iproc_return_reference: string }>("post_return", params),

  assetHistory: (vehicle_id: string) =>
    call<{ vehicle_id: string; purchases: Array<any> }>("asset_history", { vehicle_id }),
};

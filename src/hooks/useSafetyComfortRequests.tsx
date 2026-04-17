// React Query hooks for the Comfort & Safety Material Request system.
// Backed by safety_comfort_requests / _items / _eligibility / _issuances /
// _procurement_requests tables and the helper RPCs check_safety_comfort_usability
// and get_safety_comfort_allowed_items.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  ITEM_STANDARDS, getItemStandard, VEHICLE_GROUPS_MAP,
  type ChecklistItem,
} from "@/lib/safety-comfort/standard-lists";

export type RequestStatus =
  | "submitted" | "under_review" | "approved" | "rejected"
  | "pending_stock" | "fulfilled" | "cancelled";

export interface SafetyComfortRequest {
  id: string;
  organization_id: string;
  request_number: string;
  requester_id: string;
  requester_name: string | null;
  vehicle_id: string | null;
  vehicle_group: string | null;
  reason: string | null;
  notes: string | null;
  status: RequestStatus;
  eligibility_check: string | null;
  eligibility_notes: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  approval_comments: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  warehouse_checked_by: string | null;
  warehouse_checked_at: string | null;
  stock_status: string | null;
  fulfilled_at: string | null;
  fulfilled_by: string | null;
  work_order_id: string | null;
  procurement_request_id: string | null;
  total_estimated_cost: number;
  created_at: string;
  updated_at: string;
}

export interface SafetyComfortRequestItem {
  id: string;
  request_id: string;
  item_key: string;
  item_label: string;
  category: string;
  requested_qty: number;
  required_qty: string | null;
  usability_period: string | null;
  reason_for_replacement: string | null;
  last_issued_at: string | null;
  usability_check_passed: boolean | null;
  usability_check_message: string | null;
  approved_qty: number | null;
  line_status: "pending" | "approved" | "rejected" | "in_stock" | "out_of_stock" | "issued" | "cancelled";
  inventory_item_id: string | null;
  available_qty: number | null;
  unit_cost: number | null;
  estimated_cost: number | null;
  issued_qty: number | null;
  issued_at: string | null;
  notes: string | null;
}

export interface UsabilityCheckResult {
  allowed: boolean;
  last_issued_at: string | null;
  days_since_last: number | null;
  reason: string;
}

// Best-effort mapping of free-text usability period to days, used for the hard block.
export function usabilityPeriodToDays(period: string | undefined | null): number {
  if (!period) return 365;
  const p = period.toLowerCase();
  if (p.includes("month")) {
    const n = parseInt(p.match(/\d+/)?.[0] || "3", 10);
    return n * 30;
  }
  if (p.includes("two") && p.includes("year")) return 365 * 2;
  if (p.includes("five") || p.includes("5 year")) return 365 * 5;
  if (p.includes("year")) {
    const n = parseInt(p.match(/\d+/)?.[0] || "1", 10);
    return n * 365;
  }
  if (p.includes("six month")) return 180;
  if (p.includes("lifetime")) return 365 * 10;
  return 365;
}

// ---------- Eligibility (allowed items for current user/vehicle) ----------
export function useAllowedItems(vehicleId: string | undefined) {
  const { user } = useAuth() as any;
  return useQuery({
    queryKey: ["sc-allowed-items", user?.id, vehicleId],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!vehicleId) return [] as { item_key: string; source: string }[];
      const { data, error } = await supabase.rpc("get_safety_comfort_allowed_items", {
        p_user_id: user.id,
        p_vehicle_id: vehicleId,
      });
      if (error) throw error;
      return (data || []) as { item_key: string; source: string }[];
    },
  });
}

// ---------- Usability hard-block check ----------
export async function checkUsability(
  userId: string,
  vehicleId: string | null,
  itemKey: string,
): Promise<UsabilityCheckResult> {
  const std = getItemStandard(itemKey);
  const periodDays = usabilityPeriodToDays(std.usabilityPeriod);
  const { data, error } = await supabase.rpc("check_safety_comfort_usability", {
    p_user_id: userId,
    p_vehicle_id: vehicleId,
    p_item_key: itemKey,
    p_period_days: periodDays,
  });
  if (error) throw error;
  const row = (data || [])[0] || { allowed: true, last_issued_at: null, days_since_last: null, reason: "OK" };
  return row as UsabilityCheckResult;
}

// ---------- List / detail ----------
export function useSafetyComfortRequests(filters?: { status?: RequestStatus; mine?: boolean }) {
  const { organizationId } = useOrganization();
  const { user } = useAuth() as any;
  return useQuery({
    queryKey: ["sc-requests", organizationId, filters],
    enabled: !!organizationId,
    queryFn: async () => {
      let q = supabase
        .from("safety_comfort_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.mine && user?.id) q = q.eq("requester_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SafetyComfortRequest[];
    },
  });
}

export function useSafetyComfortRequestItems(requestId: string | undefined) {
  return useQuery({
    queryKey: ["sc-request-items", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_comfort_request_items")
        .select("*")
        .eq("request_id", requestId!)
        .order("created_at");
      if (error) throw error;
      return (data || []) as SafetyComfortRequestItem[];
    },
  });
}

// ---------- Create request ----------
export interface CreateRequestPayload {
  vehicle_id: string;
  vehicle_group: string;
  reason: string;
  notes?: string;
  items: Array<{
    item_key: string;
    item_label: string;
    category: string;
    requested_qty: number;
    reason_for_replacement: string;
    notes?: string;
    usability: UsabilityCheckResult;
  }>;
}

export function useCreateSafetyComfortRequest() {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  const { user, profile } = useAuth() as any;
  return useMutation({
    mutationFn: async (payload: CreateRequestPayload) => {
      if (!organizationId || !user?.id) throw new Error("Not authenticated");
      // Hard block: any usability failure aborts the request.
      const blocked = payload.items.find((i) => !i.usability.allowed);
      if (blocked) {
        throw new Error(
          `Cannot submit: "${blocked.item_label}" is still within usability period. ${blocked.usability.reason}`,
        );
      }
      const { data: req, error: e1 } = await supabase
        .from("safety_comfort_requests")
        .insert({
          organization_id: organizationId,
          request_number: "" as any, // generated by trigger
          requester_id: user.id,
          requester_name: profile?.full_name || profile?.email || null,
          vehicle_id: payload.vehicle_id,
          vehicle_group: payload.vehicle_group,
          reason: payload.reason,
          notes: payload.notes ?? null,
          status: "submitted",
          eligibility_check: "passed",
        })
        .select()
        .single();
      if (e1) throw e1;
      const items = payload.items.map((i) => {
        const std = getItemStandard(i.item_key);
        return {
          organization_id: organizationId,
          request_id: req.id,
          item_key: i.item_key,
          item_label: i.item_label,
          category: i.category,
          requested_qty: i.requested_qty,
          required_qty: std.requiredQty,
          usability_period: std.usabilityPeriod,
          reason_for_replacement: i.reason_for_replacement,
          last_issued_at: i.usability.last_issued_at,
          usability_check_passed: i.usability.allowed,
          usability_check_message: i.usability.reason,
          notes: i.notes ?? null,
          line_status: "pending" as const,
        };
      });
      const { error: e2 } = await supabase.from("safety_comfort_request_items").insert(items);
      if (e2) throw e2;
      return req as SafetyComfortRequest;
    },
    onSuccess: (req) => {
      toast.success(`Request ${req.request_number} submitted`);
      qc.invalidateQueries({ queryKey: ["sc-requests"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to submit request"),
  });
}

// ---------- Approval / rejection ----------
export function useApproveRequest() {
  const qc = useQueryClient();
  const { user, profile } = useAuth() as any;
  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      const { error } = await supabase
        .from("safety_comfort_requests")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_by_name: profile?.full_name || profile?.email || null,
          approved_at: new Date().toISOString(),
          approval_comments: comments ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request approved");
      qc.invalidateQueries({ queryKey: ["sc-requests"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to approve"),
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("safety_comfort_requests")
        .update({
          status: "rejected",
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request rejected");
      qc.invalidateQueries({ queryKey: ["sc-requests"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to reject"),
  });
}

// ---------- Stock check + fulfillment ----------
export interface StockCheckLine {
  itemId: string;
  inventoryItemId: string | null;
  availableQty: number;
  unitCost: number;
  approvedQty: number;
}

export function useStockCheckAndFulfill() {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  const { user, profile } = useAuth() as any;
  return useMutation({
    mutationFn: async ({
      requestId,
      lines,
    }: {
      requestId: string;
      lines: StockCheckLine[];
    }) => {
      if (!organizationId) throw new Error("No organization");
      // 1. Update each line with stock info & status
      let allInStock = true;
      let totalCost = 0;
      const outOfStockLines: { item_key: string; label: string; qty: number; est_unit_cost: number }[] = [];
      for (const l of lines) {
        const inStock = l.availableQty >= l.approvedQty;
        if (!inStock) allInStock = false;
        const est = (l.unitCost || 0) * l.approvedQty;
        totalCost += est;
        const { data: itemRow, error: e } = await supabase
          .from("safety_comfort_request_items")
          .update({
            inventory_item_id: l.inventoryItemId,
            available_qty: l.availableQty,
            unit_cost: l.unitCost,
            estimated_cost: est,
            approved_qty: l.approvedQty,
            line_status: inStock ? "in_stock" : "out_of_stock",
          })
          .eq("id", l.itemId)
          .select("item_key, item_label")
          .single();
        if (e) throw e;
        if (!inStock && itemRow) {
          outOfStockLines.push({
            item_key: itemRow.item_key,
            label: itemRow.item_label,
            qty: l.approvedQty - l.availableQty,
            est_unit_cost: l.unitCost,
          });
        }
      }

      // 2. Branch: fully in stock -> mark fulfilled and write issuances.
      if (allInStock) {
        const { data: req } = await supabase
          .from("safety_comfort_requests")
          .select("id, requester_id, vehicle_id")
          .eq("id", requestId).single();
        const { data: items } = await supabase
          .from("safety_comfort_request_items")
          .select("*")
          .eq("request_id", requestId);
        // create issuances
        const issuances = (items || []).map((it: any) => ({
          organization_id: organizationId,
          request_id: requestId,
          request_item_id: it.id,
          user_id: req?.requester_id,
          vehicle_id: req?.vehicle_id,
          item_key: it.item_key,
          item_label: it.item_label,
          qty: it.approved_qty || it.requested_qty,
          unit_cost: it.unit_cost,
          total_cost: it.estimated_cost,
          source: "warehouse" as const,
          inventory_item_id: it.inventory_item_id,
          issued_by: user.id,
          issued_by_name: profile?.full_name || profile?.email || null,
        }));
        if (issuances.length) {
          const { error } = await supabase.from("safety_comfort_issuances").insert(issuances);
          if (error) throw error;
        }
        await supabase
          .from("safety_comfort_request_items")
          .update({
            line_status: "issued",
            issued_at: new Date().toISOString(),
            issued_by: user.id,
          })
          .eq("request_id", requestId)
          .eq("line_status", "in_stock");
        await supabase
          .from("safety_comfort_requests")
          .update({
            status: "fulfilled",
            stock_status: "in_stock",
            warehouse_checked_by: user.id,
            warehouse_checked_at: new Date().toISOString(),
            fulfilled_by: user.id,
            fulfilled_at: new Date().toISOString(),
            total_estimated_cost: totalCost,
          })
          .eq("id", requestId);
        return { fulfilled: true, workOrderId: null, prId: null };
      }

      // 3. Out of stock: create both a Work Order (fitting) and a PR (sourcing).
      const { data: reqHdr } = await supabase
        .from("safety_comfort_requests")
        .select("id, request_number, vehicle_id, requester_name")
        .eq("id", requestId).single();
      let workOrderId: string | null = null;
      let prId: string | null = null;

      // 3a. Work order — type "corrective", description references the SCR.
      const { data: wo, error: woErr } = await supabase
        .from("work_orders")
        .insert({
          organization_id: organizationId,
          vehicle_id: reqHdr?.vehicle_id,
          work_order_number: `SC-${reqHdr?.request_number || requestId.slice(0, 8)}`,
          work_type: "corrective",
          maintenance_type: "comfort_safety",
          priority: "medium",
          status: "open",
          service_description:
            `Safety & Comfort fitting for request ${reqHdr?.request_number} ` +
            `(out-of-stock items will be sourced via PR).`,
          service_category: "safety_comfort",
          requested_for: reqHdr?.requester_name || null,
          notes: `Linked to safety_comfort_requests.id=${requestId}`,
        })
        .select("id")
        .single();
      if (!woErr && wo) workOrderId = wo.id;

      // 3b. Procurement request
      const { data: pr, error: prErr } = await supabase
        .from("safety_comfort_procurement_requests")
        .insert({
          organization_id: organizationId,
          pr_number: "" as any,
          request_id: requestId,
          status: "open",
          items: outOfStockLines as any,
          total_estimated_cost: outOfStockLines.reduce((s, x) => s + x.est_unit_cost * x.qty, 0),
          created_by: user.id,
        })
        .select("id")
        .single();
      if (!prErr && pr) prId = pr.id;

      await supabase
        .from("safety_comfort_requests")
        .update({
          status: "pending_stock",
          stock_status: "out_of_stock",
          warehouse_checked_by: user.id,
          warehouse_checked_at: new Date().toISOString(),
          total_estimated_cost: totalCost,
          work_order_id: workOrderId,
          procurement_request_id: prId,
        })
        .eq("id", requestId);
      return { fulfilled: false, workOrderId, prId };
    },
    onSuccess: (res) => {
      if (res.fulfilled) toast.success("Request fulfilled & issuances logged");
      else toast.warning("Out of stock — Work Order and Procurement Request created");
      qc.invalidateQueries({ queryKey: ["sc-requests"] });
      qc.invalidateQueries({ queryKey: ["sc-request-items"] });
    },
    onError: (err: any) => toast.error(err?.message || "Stock check failed"),
  });
}

// ---------- Eligibility allowlist admin ----------
export function useEligibilityRules() {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ["sc-eligibility", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_comfort_request_eligibility")
        .select("*")
        .eq("organization_id", organizationId)
        .order("scope_type")
        .order("scope_value");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertEligibilityRule() {
  const qc = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useAuth() as any;
  return useMutation({
    mutationFn: async (row: {
      id?: string;
      scope_type: "role" | "user" | "vehicle_group";
      scope_value: string;
      item_key: string;
      max_qty_per_period?: number | null;
      notes?: string | null;
      is_active?: boolean;
    }) => {
      const payload = { ...row, organization_id: organizationId, created_by: user?.id };
      const { error } = row.id
        ? await supabase.from("safety_comfort_request_eligibility").update(payload).eq("id", row.id)
        : await supabase.from("safety_comfort_request_eligibility").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Eligibility rule saved");
      qc.invalidateQueries({ queryKey: ["sc-eligibility"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save rule"),
  });
}

export function useDeleteEligibilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("safety_comfort_request_eligibility").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule removed");
      qc.invalidateQueries({ queryKey: ["sc-eligibility"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed"),
  });
}

// ---------- Helpers ----------
export function buildAllowedChecklistItems(
  vehicleGroupId: string,
  allowedKeys: Set<string>,
): ChecklistItem[] {
  const group = VEHICLE_GROUPS_MAP[vehicleGroupId];
  if (!group) return [];
  // Always include all group items so users can see the canonical checklist.
  // Allowlist is enforced by overlaying the source flag in the UI.
  return group.items;
}

export function isItemAllowed(itemKey: string, allowedKeys: Set<string>): boolean {
  // If no rules are configured at all we default to "allowed for the group".
  if (allowedKeys.size === 0) return true;
  return allowedKeys.has(itemKey);
}

export function REASON_OPTIONS() {
  return [
    { value: "damaged",  label: "Damaged" },
    { value: "expired",  label: "Expired" },
    { value: "missing",  label: "Missing / Lost" },
    { value: "periodic", label: "Periodic replacement" },
    { value: "new_assignment", label: "New vehicle assignment" },
  ];
}

// Avoid unused-import warnings for ITEM_STANDARDS (re-exported for convenience).
export { ITEM_STANDARDS };

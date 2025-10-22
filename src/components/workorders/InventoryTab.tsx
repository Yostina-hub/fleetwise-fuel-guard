import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle } from "lucide-react";

const InventoryTab = () => {
  const { organizationId } = useOrganization();

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory_items", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inventory_items")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("part_name", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const isLowStock = (item: any) => {
    return item.minimum_quantity && item.current_quantity <= item.minimum_quantity;
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Parts Inventory</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Part
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Part Number</TableHead>
            <TableHead>Part Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Current Qty</TableHead>
            <TableHead>Min Qty</TableHead>
            <TableHead>Unit Cost</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory?.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.part_number}</TableCell>
              <TableCell>{item.part_name}</TableCell>
              <TableCell className="capitalize">{item.category}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {item.current_quantity} {item.unit_of_measure}
                  {isLowStock(item) && (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                {item.minimum_quantity ? `${item.minimum_quantity} ${item.unit_of_measure}` : "-"}
              </TableCell>
              <TableCell>
                {item.unit_cost ? `$${Number(item.unit_cost).toFixed(2)}` : "-"}
              </TableCell>
              <TableCell>
                {isLowStock(item) ? (
                  <Badge variant="destructive">Low Stock</Badge>
                ) : (
                  <Badge variant="outline">In Stock</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InventoryTab;

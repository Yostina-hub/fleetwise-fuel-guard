import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Trash2, 
  Package, 
  Loader2,
  AlertTriangle
} from "lucide-react";
import { useWorkOrderParts } from "@/hooks/useWorkOrderParts";

interface WorkOrderPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  onPartsUpdate?: (totalCost: number) => void;
}

const WorkOrderPartsDialog = ({
  open,
  onOpenChange,
  workOrderId,
  onPartsUpdate,
}: WorkOrderPartsDialogProps) => {
  const { 
    parts, 
    inventoryItems, 
    loading, 
    totalPartsCost,
    addPart, 
    removePart,
    isAdding,
    isRemoving 
  } = useWorkOrderParts(workOrderId);

  const [newPart, setNewPart] = useState({
    inventory_item_id: "",
    part_name: "",
    part_number: "",
    quantity: 1,
    unit_cost: 0,
    is_warranty: false,
  });

  const [useCustomPart, setUseCustomPart] = useState(false);

  const handleInventorySelect = (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      setNewPart({
        ...newPart,
        inventory_item_id: itemId,
        part_name: item.part_name,
        part_number: item.part_number || "",
        unit_cost: item.unit_cost || 0,
      });
    }
  };

  const handleAddPart = () => {
    if (!newPart.part_name.trim()) return;

    addPart({
      work_order_id: workOrderId,
      inventory_item_id: useCustomPart ? undefined : newPart.inventory_item_id || undefined,
      part_name: newPart.part_name,
      part_number: newPart.part_number || undefined,
      quantity: newPart.quantity,
      unit_cost: newPart.unit_cost,
      is_warranty: newPart.is_warranty,
    });

    // Reset form
    setNewPart({
      inventory_item_id: "",
      part_name: "",
      part_number: "",
      quantity: 1,
      unit_cost: 0,
      is_warranty: false,
    });

    // Notify parent of cost update
    if (onPartsUpdate) {
      onPartsUpdate(totalPartsCost + (newPart.quantity * newPart.unit_cost));
    }
  };

  const selectedInventoryItem = inventoryItems.find(i => i.id === newPart.inventory_item_id);
  const insufficientStock = selectedInventoryItem && newPart.quantity > selectedInventoryItem.current_quantity;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" aria-hidden="true" />
            Manage Parts
          </DialogTitle>
          <DialogDescription>
            Add parts from inventory or enter custom parts for this work order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Part Form */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="customPart"
                  checked={useCustomPart}
                  onCheckedChange={(checked) => {
                    setUseCustomPart(checked as boolean);
                    if (checked) {
                      setNewPart({ ...newPart, inventory_item_id: "" });
                    }
                  }}
                />
                <Label htmlFor="customPart" className="text-sm">
                  Enter custom part (not from inventory)
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!useCustomPart ? (
                <div className="col-span-2">
                  <Label>Select from Inventory</Label>
                  <Select
                    value={newPart.inventory_item_id}
                    onValueChange={handleInventorySelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a part..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span>{item.part_name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({item.current_quantity} in stock)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {insufficientStock && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Only {selectedInventoryItem?.current_quantity} available
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <Label>Part Name</Label>
                    <Input
                      value={newPart.part_name}
                      onChange={(e) => setNewPart({ ...newPart, part_name: e.target.value })}
                      placeholder="Enter part name"
                    />
                  </div>
                  <div>
                    <Label>Part Number</Label>
                    <Input
                      value={newPart.part_number}
                      onChange={(e) => setNewPart({ ...newPart, part_number: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={newPart.quantity}
                  onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newPart.unit_cost}
                  onChange={(e) => setNewPart({ ...newPart, unit_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="warranty"
                  checked={newPart.is_warranty}
                  onCheckedChange={(checked) => setNewPart({ ...newPart, is_warranty: checked as boolean })}
                />
                <Label htmlFor="warranty" className="text-sm">
                  Covered under warranty
                </Label>
              </div>
              <Button
                onClick={handleAddPart}
                disabled={!newPart.part_name.trim() || isAdding || insufficientStock}
                className="gap-2"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Part
              </Button>
            </div>
          </div>

          {/* Parts List */}
          {parts.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{part.part_name}</span>
                          {part.part_number && (
                            <span className="text-xs text-muted-foreground ml-2">
                              #{part.part_number}
                            </span>
                          )}
                          {part.is_warranty && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Warranty
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{part.quantity}</TableCell>
                      <TableCell>${(part.unit_cost || 0).toFixed(2)}</TableCell>
                      <TableCell className="font-medium">
                        ${(part.total_cost || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removePart(part.id)}
                          disabled={isRemoving}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No parts added yet</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="text-lg font-semibold">
            Total Parts: <span className="text-primary">${totalPartsCost.toFixed(2)}</span>
          </div>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderPartsDialog;

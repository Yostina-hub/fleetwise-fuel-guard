import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
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
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { useWorkOrderParts } from "@/hooks/useWorkOrderParts";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { cn } from "@/lib/utils";

interface WorkOrderPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  onPartsUpdate?: (totalCost: number) => void;
}

const partSchema = z
  .object({
    use_custom: z.boolean(),
    inventory_item_id: z.string().optional(),
    part_name: z.string().trim().min(1, "Part name is required").max(100, "Max 100 chars"),
    part_number: z.string().trim().max(50, "Max 50 chars").optional().or(z.literal("")),
    quantity: z
      .number({ invalid_type_error: "Quantity is required" })
      .int("Must be a whole number")
      .min(1, "Must be at least 1")
      .max(10_000, "Max 10,000"),
    unit_cost: z
      .number({ invalid_type_error: "Unit cost is required" })
      .min(0, "Cannot be negative")
      .max(10_000_000, "Cost too high"),
    is_warranty: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.use_custom && !data.inventory_item_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inventory_item_id"],
        message: "Select a part from inventory",
      });
    }
  });

type PartFormData = z.infer<typeof partSchema>;

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
    isRemoving,
  } = useWorkOrderParts(workOrderId);

  const [useCustomPart, setUseCustomPart] = useState(false);
  const [newPart, setNewPart] = useState({
    inventory_item_id: "",
    part_name: "",
    part_number: "",
    quantity: 1,
    unit_cost: 0,
    is_warranty: false,
  });

  const v = useFieldValidation(partSchema);

  const formData: PartFormData = {
    use_custom: useCustomPart,
    inventory_item_id: newPart.inventory_item_id || undefined,
    part_name: newPart.part_name,
    part_number: newPart.part_number,
    quantity: newPart.quantity,
    unit_cost: newPart.unit_cost,
    is_warranty: newPart.is_warranty,
  };

  const errCls = (field: keyof PartFormData) =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const handleInventorySelect = (itemId: string) => {
    const item = inventoryItems.find((i) => i.id === itemId);
    if (item) {
      setNewPart({
        ...newPart,
        inventory_item_id: itemId,
        part_name: item.part_name,
        part_number: item.part_number || "",
        unit_cost: item.unit_cost || 0,
      });
      v.handleChange("inventory_item_id", itemId);
      v.handleChange("part_name", item.part_name);
    }
  };

  const resetForm = () => {
    setNewPart({
      inventory_item_id: "",
      part_name: "",
      part_number: "",
      quantity: 1,
      unit_cost: 0,
      is_warranty: false,
    });
    v.reset();
  };

  const selectedInventoryItem = inventoryItems.find(
    (i) => i.id === newPart.inventory_item_id,
  );
  const insufficientStock =
    !useCustomPart &&
    selectedInventoryItem &&
    newPart.quantity > selectedInventoryItem.current_quantity;

  const handleAddPart = () => {
    const result = v.validateAll(formData as unknown as Record<string, unknown>);
    if (!result.success) {
      const count = Object.keys(result.errors).length;
      toast.error(`Please fix ${count} field${count > 1 ? "s" : ""} before adding the part`);
      return;
    }

    if (insufficientStock) {
      toast.error(`Only ${selectedInventoryItem?.current_quantity} units available in stock`);
      return;
    }

    addPart({
      work_order_id: workOrderId,
      inventory_item_id: useCustomPart ? undefined : newPart.inventory_item_id || undefined,
      part_name: newPart.part_name.trim(),
      part_number: newPart.part_number?.trim() || undefined,
      quantity: newPart.quantity,
      unit_cost: newPart.unit_cost,
      is_warranty: newPart.is_warranty,
    });

    if (onPartsUpdate) {
      onPartsUpdate(totalPartsCost + newPart.quantity * newPart.unit_cost);
    }

    resetForm();
  };

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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
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
          {/* Error summary banner */}
          {v.hasVisibleErrors && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Please correct the highlighted fields</p>
                <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                  {Object.entries(v.errors).map(([k, msg]) =>
                    msg ? <li key={k}>{msg}</li> : null,
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Add Part Form */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="customPart"
                  checked={useCustomPart}
                  onCheckedChange={(checked) => {
                    const c = checked as boolean;
                    setUseCustomPart(c);
                    if (c) {
                      setNewPart({ ...newPart, inventory_item_id: "" });
                    }
                    v.reset();
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
                  <Label>
                    Select from Inventory <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newPart.inventory_item_id}
                    onValueChange={handleInventorySelect}
                  >
                    <SelectTrigger
                      className={cn(errCls("inventory_item_id"))}
                      onBlur={() =>
                        v.handleBlur("inventory_item_id", newPart.inventory_item_id)
                      }
                    >
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
                  {v.getError("inventory_item_id") && (
                    <p className="text-xs text-destructive mt-1">
                      {v.getError("inventory_item_id")}
                    </p>
                  )}
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
                    <Label>
                      Part Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={newPart.part_name}
                      onChange={(e) => {
                        setNewPart({ ...newPart, part_name: e.target.value });
                        v.handleChange("part_name", e.target.value);
                      }}
                      onBlur={() => v.handleBlur("part_name", newPart.part_name)}
                      placeholder="Enter part name"
                      maxLength={100}
                      className={cn(errCls("part_name"))}
                    />
                    {v.getError("part_name") && (
                      <p className="text-xs text-destructive mt-1">
                        {v.getError("part_name")}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Part Number</Label>
                    <Input
                      value={newPart.part_number}
                      onChange={(e) => {
                        setNewPart({ ...newPart, part_number: e.target.value });
                        v.handleChange("part_number", e.target.value);
                      }}
                      onBlur={() => v.handleBlur("part_number", newPart.part_number)}
                      placeholder="Optional"
                      maxLength={50}
                      className={cn(errCls("part_number"))}
                    />
                    {v.getError("part_number") && (
                      <p className="text-xs text-destructive mt-1">
                        {v.getError("part_number")}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div>
                <Label>
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={newPart.quantity}
                  onChange={(e) => {
                    const q = parseInt(e.target.value) || 1;
                    setNewPart({ ...newPart, quantity: q });
                    v.handleChange("quantity", q);
                  }}
                  onBlur={() => v.handleBlur("quantity", newPart.quantity)}
                  className={cn(errCls("quantity"))}
                />
                {v.getError("quantity") && (
                  <p className="text-xs text-destructive mt-1">
                    {v.getError("quantity")}
                  </p>
                )}
              </div>
              <div>
                <Label>Unit Cost (Br)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newPart.unit_cost}
                  onChange={(e) => {
                    const c = parseFloat(e.target.value) || 0;
                    setNewPart({ ...newPart, unit_cost: c });
                    v.handleChange("unit_cost", c);
                  }}
                  onBlur={() => v.handleBlur("unit_cost", newPart.unit_cost)}
                  className={cn(errCls("unit_cost"))}
                />
                {v.getError("unit_cost") && (
                  <p className="text-xs text-destructive mt-1">
                    {v.getError("unit_cost")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="warranty"
                  checked={newPart.is_warranty}
                  onCheckedChange={(checked) =>
                    setNewPart({ ...newPart, is_warranty: checked as boolean })
                  }
                />
                <Label htmlFor="warranty" className="text-sm">
                  Covered under warranty
                </Label>
              </div>
              <Button
                onClick={handleAddPart}
                disabled={isAdding || insufficientStock}
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
                      <TableCell>Br {(part.unit_cost || 0).toFixed(2)}</TableCell>
                      <TableCell className="font-medium">
                        Br {(part.total_cost || 0).toFixed(2)}
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
            Total Parts:{" "}
            <span className="text-primary">Br {totalPartsCost.toFixed(2)}</span>
          </div>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderPartsDialog;

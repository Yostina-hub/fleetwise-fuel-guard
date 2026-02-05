import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkflowNode } from "./types";

interface WorkflowNodeConfigProps {
  node: WorkflowNode | null;
  onUpdate: (nodeId: string, data: Partial<WorkflowNode["data"]>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export const WorkflowNodeConfig = ({ node, onUpdate, onDelete, onClose }: WorkflowNodeConfigProps) => {
  if (!node) return null;

  const data = node.data as any;

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">{data.icon}</span>
          <h3 className="text-sm font-bold text-foreground">Configure Node</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-xs">Node Label</Label>
            <Input
              value={data.label || ""}
              onChange={(e) => onUpdate(node.id, { label: e.target.value } as any)}
              className="h-8 text-xs"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={data.description || ""}
              onChange={(e) => onUpdate(node.id, { description: e.target.value } as any)}
              className="text-xs min-h-[60px]"
              placeholder="Describe what this node does..."
            />
          </div>

          {/* Trigger-specific config */}
          {data.category === "triggers" && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="text-xs font-semibold text-foreground">Trigger Settings</div>
              {data.nodeType === "trigger_schedule" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Cron Expression</Label>
                  <Input
                    value={data.config?.cron || ""}
                    onChange={(e) =>
                      onUpdate(node.id, { config: { ...data.config, cron: e.target.value } } as any)
                    }
                    placeholder="0 */6 * * *"
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Every 6 hours: 0 */6 * * *</p>
                </div>
              )}
              {data.nodeType === "trigger_geofence" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Event Type</Label>
                    <Select
                      value={data.config?.eventType || "enter"}
                      onValueChange={(v) =>
                        onUpdate(node.id, { config: { ...data.config, eventType: v } } as any)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enter">Enter Zone</SelectItem>
                        <SelectItem value="exit">Exit Zone</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Condition-specific config */}
          {data.category === "conditions" && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="text-xs font-semibold text-foreground">Condition Logic</div>
              <div className="space-y-1.5">
                <Label className="text-xs">Left Operand</Label>
                <Input
                  value={data.config?.leftOperand || ""}
                  onChange={(e) =>
                    onUpdate(node.id, { config: { ...data.config, leftOperand: e.target.value } } as any)
                  }
                  placeholder="e.g., vehicle.speed"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Operator</Label>
                <Select
                  value={data.config?.operator || "equals"}
                  onValueChange={(v) =>
                    onUpdate(node.id, { config: { ...data.config, operator: v } } as any)
                  }
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals (==)</SelectItem>
                    <SelectItem value="not_equals">Not Equals (!=)</SelectItem>
                    <SelectItem value="greater_than">Greater Than (&gt;)</SelectItem>
                    <SelectItem value="less_than">Less Than (&lt;)</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="in">In List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Right Operand</Label>
                <Input
                  value={data.config?.rightOperand || ""}
                  onChange={(e) =>
                    onUpdate(node.id, { config: { ...data.config, rightOperand: e.target.value } } as any)
                  }
                  placeholder="e.g., 120"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Notification config */}
          {data.category === "notifications" && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="text-xs font-semibold text-foreground">Notification Settings</div>
              <div className="space-y-1.5">
                <Label className="text-xs">Recipients</Label>
                <Input
                  value={data.config?.recipients || ""}
                  onChange={(e) =>
                    onUpdate(node.id, { config: { ...data.config, recipients: e.target.value } } as any)
                  }
                  placeholder="email@example.com, ..."
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message Template</Label>
                <Textarea
                  value={data.config?.template || ""}
                  onChange={(e) =>
                    onUpdate(node.id, { config: { ...data.config, template: e.target.value } } as any)
                  }
                  placeholder="Use {{vehicle.name}}, {{driver.name}} placeholders"
                  className="text-xs min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Timing config */}
          {data.category === "timing" && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="text-xs font-semibold text-foreground">Timing Settings</div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={data.config?.duration || ""}
                    onChange={(e) =>
                      onUpdate(node.id, {
                        config: { ...data.config, duration: parseInt(e.target.value) || 0 },
                      } as any)
                    }
                    placeholder="5"
                    className="h-8 text-xs flex-1"
                  />
                  <Select
                    value={data.config?.durationUnit || "minutes"}
                    onValueChange={(v) =>
                      onUpdate(node.id, { config: { ...data.config, durationUnit: v } } as any)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Sec</SelectItem>
                      <SelectItem value="minutes">Min</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Fleet-specific config */}
          {data.category === "fleet" && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="text-xs font-semibold text-foreground">Fleet Action Settings</div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Vehicle Filter</Label>
                <Select
                  value={data.config?.vehicleFilter || "all"}
                  onValueChange={(v) =>
                    onUpdate(node.id, { config: { ...data.config, vehicleFilter: v } } as any)
                  }
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicles</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="idle">Idle Only</SelectItem>
                    <SelectItem value="specific">Specific Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto-assign</Label>
                <Switch
                  checked={data.config?.autoAssign || false}
                  onCheckedChange={(v) =>
                    onUpdate(node.id, { config: { ...data.config, autoAssign: v } } as any)
                  }
                />
              </div>
            </div>
          )}

          {/* Data config */}
          {data.category === "data" && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="text-xs font-semibold text-foreground">Data Settings</div>
              {data.nodeType === "data_api_call" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">HTTP Method</Label>
                    <Select
                      value={data.config?.method || "GET"}
                      onValueChange={(v) =>
                        onUpdate(node.id, { config: { ...data.config, method: v } } as any)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">URL</Label>
                    <Input
                      value={data.config?.url || ""}
                      onChange={(e) =>
                        onUpdate(node.id, { config: { ...data.config, url: e.target.value } } as any)
                      }
                      placeholder="https://api.example.com/..."
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </>
              )}
              {data.nodeType === "data_lookup" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Table Name</Label>
                  <Select
                    value={data.config?.table || "vehicles"}
                    onValueChange={(v) =>
                      onUpdate(node.id, { config: { ...data.config, table: v } } as any)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                      <SelectItem value="drivers">Drivers</SelectItem>
                      <SelectItem value="trips">Trips</SelectItem>
                      <SelectItem value="alerts">Alerts</SelectItem>
                      <SelectItem value="fuel_logs">Fuel Logs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Mark as configured */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Mark as Configured</Label>
            <Switch
              checked={data.isConfigured || false}
              onCheckedChange={(v) => onUpdate(node.id, { isConfigured: v } as any)}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(node.id)}
          className="w-full h-8 gap-1.5 text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Node
        </Button>
      </div>
    </div>
  );
};

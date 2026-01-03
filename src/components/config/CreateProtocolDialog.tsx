import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDeviceProtocols, CreateProtocolData } from "@/hooks/useDeviceProtocols";
import { DeviceTemplate } from "@/data/deviceTemplates";
import { Zap, Settings, FileCode } from "lucide-react";

interface CreateProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CRC_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'xor', label: 'XOR Checksum' },
  { value: 'crc16', label: 'CRC-16' },
  { value: 'crc16_x25', label: 'CRC-16 X.25 (GT06)' },
  { value: 'crc16_ccitt', label: 'CRC-16 CCITT' },
  { value: 'crc32', label: 'CRC-32' },
  { value: 'checksum', label: 'Simple Checksum' },
];

export const CreateProtocolDialog = ({ open, onOpenChange }: CreateProtocolDialogProps) => {
  const { createProtocol, createFromTemplate, templates } = useDeviceProtocols();
  const [activeTab, setActiveTab] = useState<string>("template");
  
  // Manual form state
  const [vendor, setVendor] = useState("");
  const [protocolName, setProtocolName] = useState("");
  const [version, setVersion] = useState("1.0");
  const [port, setPort] = useState("5000");
  const [crcEnabled, setCrcEnabled] = useState(true);
  const [crcType, setCrcType] = useState("crc16");
  const [notes, setNotes] = useState("");

  const handleCreateManual = () => {
    const data: CreateProtocolData = {
      vendor,
      protocol_name: protocolName,
      version,
      decoder_config: {
        port: parseInt(port),
        crc_enabled: crcEnabled,
        crc_type: crcType,
      },
      is_active: true,
      notes,
    };
    
    createProtocol.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
  };

  const handleCreateFromTemplate = (template: DeviceTemplate) => {
    createFromTemplate.mutate(template.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const resetForm = () => {
    setVendor("");
    setProtocolName("");
    setVersion("1.0");
    setPort("5000");
    setCrcEnabled(true);
    setCrcType("crc16");
    setNotes("");
  };

  const popularTemplates = templates.filter(t => t.popular);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Protocol Configuration</DialogTitle>
          <DialogDescription>
            Create from a template or configure manually
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              From Template
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manual Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid gap-3">
                {popularTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {template.protocol.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Port {template.defaultPort}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {template.features.length} features
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreateFromTemplate(template)}
                      disabled={createFromTemplate.isPending}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor *</Label>
                  <Input
                    id="vendor"
                    placeholder="e.g., Teltonika"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protocol">Protocol Name *</Label>
                  <Input
                    id="protocol"
                    placeholder="e.g., teltonika"
                    value={protocolName}
                    onChange={(e) => setProtocolName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    placeholder="1.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Default Port</Label>
                  <Input
                    id="port"
                    type="number"
                    placeholder="5000"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>CRC Validation</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable checksum validation for data integrity
                    </p>
                  </div>
                  <Switch
                    checked={crcEnabled}
                    onCheckedChange={setCrcEnabled}
                  />
                </div>

                {crcEnabled && (
                  <div className="space-y-2">
                    <Label>CRC Type</Label>
                    <Select value={crcType} onValueChange={setCrcType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CRC_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional configuration notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateManual}
                  disabled={!vendor || !protocolName || createProtocol.isPending}
                >
                  Create Protocol
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

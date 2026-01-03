import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useDeviceProtocols, DeviceProtocol } from "@/hooks/useDeviceProtocols";

interface EditProtocolDialogProps {
  protocol: DeviceProtocol | null;
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

export const EditProtocolDialog = ({ protocol, open, onOpenChange }: EditProtocolDialogProps) => {
  const { updateProtocol } = useDeviceProtocols();
  
  const [vendor, setVendor] = useState("");
  const [protocolName, setProtocolName] = useState("");
  const [version, setVersion] = useState("");
  const [port, setPort] = useState("");
  const [crcEnabled, setCrcEnabled] = useState(true);
  const [crcType, setCrcType] = useState("crc16");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (protocol) {
      setVendor(protocol.vendor);
      setProtocolName(protocol.protocol_name);
      setVersion(protocol.version || "");
      setPort(String(protocol.decoder_config?.port || ""));
      setCrcEnabled(protocol.decoder_config?.crc_enabled ?? true);
      setCrcType(protocol.decoder_config?.crc_type || "crc16");
      setIsActive(protocol.is_active ?? true);
      setNotes(protocol.notes || "");
    }
  }, [protocol]);

  const handleSave = () => {
    if (!protocol) return;

    updateProtocol.mutate({
      id: protocol.id,
      vendor,
      protocol_name: protocolName,
      version: version || null,
      decoder_config: {
        ...protocol.decoder_config,
        port: port ? parseInt(port) : undefined,
        crc_enabled: crcEnabled,
        crc_type: crcType,
      },
      is_active: isActive,
      notes: notes || null,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  if (!protocol) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Protocol Configuration</DialogTitle>
          <DialogDescription>
            Update the protocol decoder settings
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable this protocol
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-vendor">Vendor</Label>
              <Input
                id="edit-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-protocol">Protocol Name</Label>
              <Input
                id="edit-protocol"
                value={protocolName}
                onChange={(e) => setProtocolName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-version">Version</Label>
              <Input
                id="edit-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-port">Default Port</Label>
              <Input
                id="edit-port"
                type="number"
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
                  Checksum validation for data integrity
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

          {protocol.decoder_config?.features && (
            <div className="space-y-2">
              <Label>Supported Features</Label>
              <div className="flex flex-wrap gap-1">
                {protocol.decoder_config.features.map((feature, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!vendor || !protocolName || updateProtocol.isPending}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

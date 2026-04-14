import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Radio, Wifi, Terminal, MessageSquare, Server } from "lucide-react";
import { deviceTemplates } from "@/data/deviceTemplates";

interface DeviceSetupGuideProps {
  serverIp: string;
  onServerIpChange?: (ip: string) => void;
}

const smsCommands: Record<string, { apn: string; server: string; timer: string; description: string }> = {
  gt06: {
    apn: "APN,{apn}#",
    server: "SERVER,1,{ip},{port},0#",
    timer: "TIMER,10#",
    description: "Send via SMS to device phone number",
  },
  tk103: {
    apn: "apn123456 {apn}",
    server: "adminip123456 {ip} {port}",
    timer: "upload123456 10",
    description: "Default password: 123456",
  },
  h02: {
    apn: "APN,{apn}#",
    server: "SERVER,0,{ip},{port},0#",
    timer: "TIMER,10#",
    description: "Same as GT06 protocol SMS",
  },
  teltonika: {
    apn: "Configure via Teltonika Configurator Tool (USB)",
    server: "Server: {ip}, Port: {port}, Protocol: TCP",
    timer: "Min Period: 10s, Send Period: 30s",
    description: "Use Teltonika Configurator software (USB connection required)",
  },
  queclink: {
    apn: "AT+GTQSS={password},0,{apn},,,,,,,,,0001$",
    server: "AT+GTSVR={password},{ip},{port},,,0001$",
    timer: "AT+GTFRI={password},1,,1,10,30,,,,,,0001$",
    description: "Default password: gl300",
  },
  ruptela: {
    apn: "Configure via Ruptela Device Center (USB/OTA)",
    server: "Primary Server: {ip}:{port}",
    timer: "Home interval: 10s, Roaming: 30s",
    description: "Use Ruptela Device Center software",
  },
  ytwl: {
    apn: "apn,{apn}#",
    server: "ip,{ip},{port}#",
    timer: "timer,10#",
    description: "Send via SMS to device SIM number",
  },
  mqtt: {
    apn: "N/A – MQTT devices use WiFi or built-in cellular",
    server: "Broker: {ip}:1883 | Topic: fleet/{IMEI}/telemetry",
    timer: "Publish interval: 10 seconds (device firmware setting)",
    description: "Configure device MQTT broker settings",
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function CommandBlock({ label, command }: { label: string; command: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/70 px-3 py-2 font-mono text-xs">
      <div>
        <span className="text-muted-foreground mr-2">{label}:</span>
        <span className="break-all">{command}</span>
      </div>
      <CopyButton text={command} />
    </div>
  );
}

export function DeviceSetupGuide({ serverIp, onServerIpChange }: DeviceSetupGuideProps) {
  const [selectedProtocol, setSelectedProtocol] = useState("gt06");
  const [apn, setApn] = useState("internet");

  // Group templates by protocol
  const protocolGroups = deviceTemplates.reduce<Record<string, typeof deviceTemplates>>((acc, t) => {
    if (!acc[t.protocol]) acc[t.protocol] = [];
    acc[t.protocol].push(t);
    return acc;
  }, {});

  const selectedTemplate = deviceTemplates.find((t) => t.protocol === selectedProtocol);
  const port = selectedTemplate?.defaultPort || 5001;
  const commands = smsCommands[selectedProtocol];

  const replaceVars = (cmd: string) =>
    cmd.replace("{ip}", serverIp || "YOUR_VPS_IP").replace("{port}", String(port)).replace("{apn}", apn).replace("{password}", "123456");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Server className="h-5 w-5 text-primary" />
          Device Setup Guide
          <Badge variant="outline" className="ml-auto font-normal">
            Auto-Provision Enabled
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure your GPS device to connect directly to the gateway. Devices are auto-registered on first connection.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Server IP Config */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Gateway Server IP</label>
            <Input
              placeholder="e.g., 195.168.1.100"
              value={serverIp}
              onChange={(e) => onServerIpChange?.(e.target.value)}
              className="font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">SIM Card APN</label>
            <Input placeholder="e.g., internet" value={apn} onChange={(e) => setApn(e.target.value)} className="font-mono" />
          </div>
        </div>

        {/* Protocol Selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Select Device Protocol</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(protocolGroups).map(([proto, templates]) => (
              <Button
                key={proto}
                variant={selectedProtocol === proto ? "default" : "outline"}
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => setSelectedProtocol(proto)}
              >
                <span>{templates[0].icon}</span>
                {proto.toUpperCase()}
                <Badge variant="secondary" className="text-[10px] px-1">
                  :{templates[0].defaultPort}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Supported Devices for Protocol */}
        <div className="rounded-lg border p-3 bg-muted/30">
          <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            Compatible Devices ({selectedProtocol.toUpperCase()} Protocol)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {protocolGroups[selectedProtocol]?.map((t) => (
              <Badge key={t.id} variant="outline" className="text-xs">
                {t.icon} {t.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Connection Details */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Wifi className="h-4 w-4 text-primary" />
            Connection Settings for Device
          </p>
          <CommandBlock label="Server IP" command={serverIp || "YOUR_VPS_IP"} />
          <CommandBlock label="Port" command={selectedProtocol === 'mqtt' ? '1883' : String(port)} />
          <CommandBlock label="Protocol" command={selectedProtocol === 'mqtt' ? 'MQTT (TCP)' : 'TCP'} />
          {selectedProtocol === 'mqtt' && (
            <>
              <CommandBlock label="WS Port" command="9883" />
              <CommandBlock label="Topic" command="fleet/{IMEI}/telemetry" />
              <CommandBlock label="Payload" command='{"latitude":9.02,"longitude":38.75,"speed":45,"ignition":true}' />
            </>
          )}
          <CommandBlock label="APN" command={apn} />
          <CommandBlock label="Report Interval" command="10 seconds" />
        </div>

        {/* Configuration Method */}
        {commands && (
          <Tabs defaultValue="sms" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="sms" className="flex-1 gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> SMS Commands
              </TabsTrigger>
              <TabsTrigger value="tool" className="flex-1 gap-1.5">
                <Terminal className="h-3.5 w-3.5" /> Config Tool
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sms" className="space-y-2 mt-3">
              <p className="text-xs text-muted-foreground">{commands.description}</p>
              <div className="space-y-1.5">
                <CommandBlock label="1. Set APN" command={replaceVars(commands.apn)} />
                <CommandBlock label="2. Set Server" command={replaceVars(commands.server)} />
                <CommandBlock label="3. Set Interval" command={replaceVars(commands.timer)} />
              </div>
            </TabsContent>
            <TabsContent value="tool" className="mt-3">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-2">
                {selectedProtocol === "teltonika" && (
                  <>
                    <p className="font-medium">Teltonika Configurator (USB)</p>
                    <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                      <li>Download Teltonika Configurator from fota.teltonika.lt</li>
                      <li>Connect device via USB cable</li>
                      <li>Go to GPRS → Server Settings</li>
                      <li>Set Domain: <span className="font-mono">{serverIp || "YOUR_VPS_IP"}</span></li>
                      <li>Set Port: <span className="font-mono">{port}</span></li>
                      <li>Set Protocol: TCP</li>
                      <li>Go to APN → Set your carrier APN</li>
                      <li>Save to device</li>
                    </ol>
                  </>
                )}
                {selectedProtocol === "ruptela" && (
                  <>
                    <p className="font-medium">Ruptela Device Center</p>
                    <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                      <li>Download Ruptela Device Center from ruptela.com</li>
                      <li>Connect device via USB or use OTA</li>
                      <li>Set Primary Server: <span className="font-mono">{serverIp || "YOUR_VPS_IP"}:{port}</span></li>
                      <li>Configure APN settings</li>
                      <li>Set sending intervals</li>
                      <li>Save configuration</li>
                    </ol>
                  </>
                )}
                {selectedProtocol === "mqtt" && (
                  <>
                    <p className="font-medium">MQTT Device Configuration</p>
                    <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                      <li>Set MQTT Broker Host: <span className="font-mono">{serverIp || "YOUR_VPS_IP"}</span></li>
                      <li>Set MQTT Port: <span className="font-mono">1883</span> (TCP) or <span className="font-mono">9883</span> (WebSocket)</li>
                      <li>Set Publish Topic: <span className="font-mono">fleet/&#123;IMEI&#125;/telemetry</span></li>
                      <li>Set Payload Format: JSON with lat, lng, speed, heading, ignition fields</li>
                      <li>Optional: Subscribe to <span className="font-mono">fleet/&#123;IMEI&#125;/command</span> for remote commands</li>
                      <li>Set QoS: 1 (at least once) for telemetry, 2 for commands</li>
                      <li>Set Keep-Alive: 60 seconds</li>
                    </ol>
                  </>
                )}
                {selectedProtocol !== "teltonika" && selectedProtocol !== "ruptela" && selectedProtocol !== "mqtt" && (
                  <p className="text-xs text-muted-foreground">
                    This device is typically configured via SMS commands. Switch to the SMS tab for instructions.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Auto-Provision Notice */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 p-3">
          <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
            ✓ Auto-Provision Active
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
            When a device connects with a new IMEI, it is automatically registered in your fleet.
            No need to manually add devices first — just configure the device with the server IP and port above,
            and it will appear in your device list on first connection.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

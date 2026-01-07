import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Clock,
  Lock,
  Phone,
  Fuel,
  Droplets,
  Flag,
  Ruler,
  Power,
  RotateCcw,
  Bell,
  Volume2,
  Bluetooth,
  Settings2,
  Shield,
  Car,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Vibrate,
  AlertTriangle,
  Radio,
  Gauge,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    vehicleId: string;
    plate: string;
    make: string;
    model: string;
    phoneNumber?: string;
  } | null;
  organizationId?: string;
}

interface SettingItem {
  id: string;
  label: string;
  icon: React.ElementType;
  type: "toggle" | "value" | "select" | "slider" | "action";
  value?: string | number | boolean;
  options?: { label: string; value: string }[];
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  dangerous?: boolean;
  description?: string;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

const TIMEZONE_OPTIONS = [
  { label: "-12:00", value: "-12" },
  { label: "-11:00", value: "-11" },
  { label: "-10:00", value: "-10" },
  { label: "-9:00", value: "-9" },
  { label: "-8:00", value: "-8" },
  { label: "-7:00", value: "-7" },
  { label: "-6:00", value: "-6" },
  { label: "-5:00", value: "-5" },
  { label: "-4:00", value: "-4" },
  { label: "-3:00", value: "-3" },
  { label: "-2:00", value: "-2" },
  { label: "-1:00", value: "-1" },
  { label: "0:00 (UTC)", value: "0" },
  { label: "+1:00", value: "+1" },
  { label: "+2:00", value: "+2" },
  { label: "+3:00", value: "+3" },
  { label: "+4:00", value: "+4" },
  { label: "+5:00", value: "+5" },
  { label: "+5:30", value: "+5.5" },
  { label: "+6:00", value: "+6" },
  { label: "+7:00", value: "+7" },
  { label: "+8:00", value: "+8" },
  { label: "+9:00", value: "+9" },
  { label: "+10:00", value: "+10" },
  { label: "+11:00", value: "+11" },
  { label: "+12:00", value: "+12" },
];

const SENSITIVITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const MILEAGE_UNIT_OPTIONS = [
  { label: "km, km/h", value: "metric" },
  { label: "mi, mph", value: "imperial" },
];

export const TerminalSettingsPanel = ({
  open,
  onOpenChange,
  vehicle,
  organizationId: propOrganizationId,
}: TerminalSettingsPanelProps) => {
  const { user } = useAuth();
  const { organizationId: hookOrganizationId } = useOrganization();
  const organizationId = propOrganizationId || hookOrganizationId;

  // Settings state
  const [settings, setSettings] = useState({
    timezone: "+3",
    smsPassword: "123456",
    authNumber: "",
    tankVolume: 0,
    oilCalibration: "zero",
    initialMileage: 0,
    mileageUnit: "metric",
    accNotify: false,
    turningAngle: 15,
    alarmSendTimes: 1,
    sensitivity: "medium",
    speakerSwitch: true,
    bluetoothSwitch: true,
  });

  const [activeSubPanel, setActiveSubPanel] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Swipe gesture for sub-panels
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);

  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const sendCommand = async (commandType: string, commandData: Record<string, any>) => {
    if (!vehicle || !organizationId) return;

    setSending(true);
    try {
      // Generate SMS content based on command type
      let smsContent = "";
      switch (commandType) {
        case "timezone":
          smsContent = `timezone123456 ${commandData.value}`;
          break;
        case "smsPassword":
          smsContent = `password123456 ${commandData.value}`;
          break;
        case "authNumber":
          smsContent = `admin123456 ${commandData.value}`;
          break;
        case "tankVolume":
          smsContent = `tank123456 ${commandData.value}`;
          break;
        case "oilCalibration":
          smsContent = commandData.value === "zero" ? "oilreset123456" : "oilcal123456";
          break;
        case "initialMileage":
          smsContent = `mileage123456 ${commandData.value}`;
          break;
        case "mileageUnit":
          smsContent = commandData.value === "metric" ? "metric123456" : "imperial123456";
          break;
        case "accNotify":
          smsContent = commandData.value ? "accon123456" : "accoff123456";
          break;
        case "turningAngle":
          smsContent = `angle123456 ${commandData.value}`;
          break;
        case "alarmSendTimes":
          smsContent = `alarmtimes123456 ${commandData.value}`;
          break;
        case "sensitivity":
          smsContent = `sensitivity123456 ${commandData.value}`;
          break;
        case "speakerSwitch":
          smsContent = commandData.value ? "speaker123456" : "mute123456";
          break;
        case "bluetoothSwitch":
          smsContent = commandData.value ? "bton123456" : "btoff123456";
          break;
        case "factoryReset":
          smsContent = "reset123456";
          break;
        default:
          smsContent = `${commandType}123456`;
      }

      // Log to database
      const { error } = await (supabase as any)
        .from("device_commands")
        .insert({
          device_id: vehicle.vehicleId,
          vehicle_id: vehicle.vehicleId,
          organization_id: organizationId,
          command_type: `terminal_${commandType}`,
          command_payload: { ...commandData, sms_content: smsContent },
          status: "pending",
          priority: "normal",
          created_by: user?.id || null,
        });

      if (error) throw error;

      setLastSaved(commandType);
      toast.success("Setting updated", {
        description: `${vehicle.plate} - Command queued for delivery`,
        icon: <Check className="h-4 w-4" />,
      });

      // Clear success indicator after 2 seconds
      setTimeout(() => setLastSaved(null), 2000);
    } catch (error) {
      console.error("Error sending terminal command:", error);
      toast.error("Failed to update setting");
    } finally {
      setSending(false);
    }
  };

  const handleFactoryReset = async () => {
    if (!vehicle) return;
    
    if (!confirm("Are you sure you want to restore factory settings? This action cannot be undone.")) {
      return;
    }

    await sendCommand("factoryReset", { action: "reset" });
  };

  const settingGroups: SettingGroup[] = [
    {
      title: "Device Configuration",
      items: [
        {
          id: "timezone",
          label: "Time Zone",
          icon: Clock,
          type: "select" as const,
          value: settings.timezone,
          options: TIMEZONE_OPTIONS,
          description: "Set the device's time zone for accurate timestamps",
        },
        {
          id: "smsPassword",
          label: "Set SMS password",
          icon: Lock,
          type: "value" as const,
          value: settings.smsPassword,
          description: "Password for SMS commands (default: 123456)",
        },
        {
          id: "authNumber",
          label: "Set authorization number",
          icon: Phone,
          type: "value" as const,
          value: settings.authNumber,
          description: "Authorized phone number for device control",
        },
      ],
    },
    {
      title: "Fuel & Mileage",
      items: [
        {
          id: "tankVolume",
          label: "Set the tank volume (L)",
          icon: Fuel,
          type: "slider" as const,
          value: settings.tankVolume,
          min: 0,
          max: 500,
          step: 5,
          unit: "L",
        },
        {
          id: "oilCalibration",
          label: "Oil calibration",
          icon: Droplets,
          type: "select" as const,
          value: settings.oilCalibration,
          options: [
            { label: "Zero", value: "zero" },
            { label: "Full", value: "full" },
            { label: "Custom", value: "custom" },
          ],
        },
        {
          id: "initialMileage",
          label: "Set initial mileage (M)",
          icon: Flag,
          type: "slider" as const,
          value: settings.initialMileage,
          min: 0,
          max: 999999,
          step: 100,
          unit: "km",
        },
        {
          id: "mileageUnit",
          label: "Mileage display unit",
          icon: Ruler,
          type: "select" as const,
          value: settings.mileageUnit,
          options: MILEAGE_UNIT_OPTIONS,
        },
      ],
    },
    {
      title: "Alerts & Sensitivity",
      items: [
        {
          id: "accNotify",
          label: "Acc notify",
          icon: Power,
          type: "toggle" as const,
          value: settings.accNotify,
          description: "Notify when ignition status changes",
        },
        {
          id: "turningAngle",
          label: "Set the turning angle",
          icon: RotateCcw,
          type: "slider" as const,
          value: settings.turningAngle,
          min: 5,
          max: 90,
          step: 5,
          unit: "°",
        },
        {
          id: "alarmSendTimes",
          label: "Set the send times of alarm",
          icon: Bell,
          type: "slider" as const,
          value: settings.alarmSendTimes,
          min: 1,
          max: 10,
          step: 1,
        },
        {
          id: "sensitivity",
          label: "Sensitivity",
          icon: Vibrate,
          type: "select" as const,
          value: settings.sensitivity,
          options: SENSITIVITY_OPTIONS,
        },
      ],
    },
    {
      title: "Advanced Settings",
      items: [
        {
          id: "alarmSettings",
          label: "Alarm Settings",
          icon: AlertTriangle,
          type: "action" as const,
          description: "Configure alarm types and thresholds",
        },
        {
          id: "drivingBehavior",
          label: "Driving behavior setting",
          icon: Car,
          type: "action" as const,
          description: "Set driving behavior detection parameters",
        },
      ],
    },
    {
      title: "Connectivity",
      items: [
        {
          id: "speakerSwitch",
          label: "Speaker switch",
          icon: Volume2,
          type: "toggle" as const,
          value: settings.speakerSwitch,
        },
        {
          id: "bluetoothSwitch",
          label: "Bluetooth switch",
          icon: Bluetooth,
          type: "toggle" as const,
          value: settings.bluetoothSwitch,
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          id: "factoryReset",
          label: "Restore factory settings",
          icon: Settings2,
          type: "action" as const,
          dangerous: true,
          description: "Reset all settings to factory defaults",
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem, index: number) => {
    const Icon = item.icon;
    const isActive = lastSaved === item.id;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        className={cn(
          "group relative flex items-center justify-between px-4 py-3.5 transition-all duration-200",
          "hover:bg-muted/50 active:bg-muted/70",
          "border-b border-border/50 last:border-b-0",
          item.dangerous && "hover:bg-destructive/10"
        )}
      >
        {/* Success indicator pulse */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 bg-primary/10 rounded-lg"
            />
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
              "bg-muted group-hover:bg-background",
              item.dangerous && "bg-destructive/10 text-destructive"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span
              className={cn(
                "text-sm font-medium block truncate",
                item.dangerous && "text-destructive"
              )}
            >
              {item.label}
            </span>
            {item.description && (
              <span className="text-xs text-muted-foreground line-clamp-1">
                {item.description}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.type === "toggle" && (
            <Switch
              checked={item.value as boolean}
              onCheckedChange={(checked) => {
                handleSettingChange(item.id, checked);
                sendCommand(item.id, { value: checked });
              }}
              className={cn(
                "data-[state=checked]:bg-emerald-500",
                sending && "opacity-50 pointer-events-none"
              )}
            />
          )}

          {item.type === "value" && (
            <button
              onClick={() => setActiveSubPanel(item.id)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="max-w-[80px] truncate">
                {item.value || "Not set"}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {item.type === "select" && (
            <button
              onClick={() => setActiveSubPanel(item.id)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="max-w-[80px] truncate">
                {item.options?.find((o) => o.value === item.value)?.label ||
                  item.value}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {item.type === "slider" && (
            <button
              onClick={() => setActiveSubPanel(item.id)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>
                {item.value}
                {item.unit && ` ${item.unit}`}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {item.type === "action" && (
            <button
              onClick={() => {
                if (item.id === "factoryReset") {
                  handleFactoryReset();
                } else {
                  setActiveSubPanel(item.id);
                }
              }}
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Loading indicator */}
          {sending && lastSaved === item.id && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </div>
      </motion.div>
    );
  };

  const renderSubPanel = () => {
    if (!activeSubPanel) return null;

    const allItems: SettingItem[] = settingGroups.flatMap((g) => g.items);
    const item = allItems.find((i) => i.id === activeSubPanel);
    if (!item) return null;

    return (
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute inset-0 bg-background z-10 flex flex-col"
        style={{ x, opacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info: PanInfo) => {
          if (info.offset.x > 100) {
            setActiveSubPanel(null);
          }
        }}
      >
        {/* Sub-panel header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setActiveSubPanel(null)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-sm">{item.label}</h3>
        </div>

        <ScrollArea className="flex-1 p-4">
          {item.type === "value" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={item.id}>{item.label}</Label>
                <Input
                  id={item.id}
                  value={settings[item.id as keyof typeof settings] as string}
                  onChange={(e) => handleSettingChange(item.id, e.target.value)}
                  placeholder={`Enter ${item.label.toLowerCase()}`}
                  className="text-center text-lg font-mono"
                />
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
              <Button
                className="w-full"
                onClick={() => {
                  sendCommand(item.id, {
                    value: settings[item.id as keyof typeof settings],
                  });
                  setActiveSubPanel(null);
                }}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          )}

          {item.type === "select" && (
            <div className="space-y-4">
              <RadioGroup
                value={settings[item.id as keyof typeof settings] as string}
                onValueChange={(value) => {
                  handleSettingChange(item.id, value);
                }}
                className="space-y-2"
              >
                {item.options?.map((option) => (
                  <motion.label
                    key={option.value}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all",
                      "border-2",
                      settings[item.id as keyof typeof settings] === option.value
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted hover:bg-muted/80"
                    )}
                  >
                    <span className="font-medium">{option.label}</span>
                    <RadioGroupItem value={option.value} className="sr-only" />
                    {settings[item.id as keyof typeof settings] === option.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </motion.div>
                    )}
                  </motion.label>
                ))}
              </RadioGroup>
              <Button
                className="w-full"
                onClick={() => {
                  sendCommand(item.id, {
                    value: settings[item.id as keyof typeof settings],
                  });
                  setActiveSubPanel(null);
                }}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Apply
              </Button>
            </div>
          )}

          {item.type === "slider" && (
            <div className="space-y-6">
              <div className="text-center">
                <motion.div
                  key={String(settings[item.id as keyof typeof settings])}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl font-bold text-primary mb-1"
                >
                  {settings[item.id as keyof typeof settings]}
                  {item.unit && (
                    <span className="text-2xl text-muted-foreground ml-1">
                      {item.unit}
                    </span>
                  )}
                </motion.div>
                <p className="text-sm text-muted-foreground">
                  Drag to adjust
                </p>
              </div>

              <div className="px-4">
                <Slider
                  value={[settings[item.id as keyof typeof settings] as number]}
                  onValueChange={([value]) => handleSettingChange(item.id, value)}
                  min={item.min || 0}
                  max={item.max || 100}
                  step={item.step || 1}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>
                    {item.min}
                    {item.unit}
                  </span>
                  <span>
                    {item.max}
                    {item.unit}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  sendCommand(item.id, {
                    value: settings[item.id as keyof typeof settings],
                  });
                  setActiveSubPanel(null);
                }}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Set Value
              </Button>
            </div>
          )}

          {item.type === "action" && item.id === "alarmSettings" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure which alarms the device should trigger and report.
              </p>
              {[
                { id: "sos", label: "SOS/Panic Button", icon: AlertTriangle },
                { id: "vibration", label: "Vibration Alarm", icon: Vibrate },
                { id: "lowBattery", label: "Low Battery Alert", icon: Gauge },
                { id: "powerCut", label: "Power Cut Alert", icon: Power },
                { id: "geofence", label: "Geofence Alert", icon: Shield },
                { id: "speeding", label: "Speeding Alert", icon: Gauge },
              ].map((alarm) => (
                <div
                  key={alarm.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <alarm.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{alarm.label}</span>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          )}

          {item.type === "action" && item.id === "drivingBehavior" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure driving behavior detection thresholds.
              </p>
              {[
                { id: "harshBraking", label: "Harsh Braking", value: 0.5 },
                { id: "harshAcceleration", label: "Harsh Acceleration", value: 0.4 },
                { id: "sharpTurn", label: "Sharp Turn", value: 30 },
                { id: "idling", label: "Idling Timeout (min)", value: 5 },
              ].map((behavior) => (
                <div key={behavior.id} className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">{behavior.label}</Label>
                    <span className="text-sm text-muted-foreground">
                      {behavior.value}
                    </span>
                  </div>
                  <Slider defaultValue={[behavior.value * 100]} max={100} />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </motion.div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden">
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <SheetTitle className="text-lg font-semibold">
                Terminal Settings
              </SheetTitle>
              <div className="w-8" />
            </div>
            {vehicle && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5" />
                <span>
                  {vehicle.plate} • {vehicle.make} {vehicle.model}
                </span>
              </div>
            )}
          </SheetHeader>

          {/* Settings List */}
          <ScrollArea className="flex-1">
            <div className="pb-safe">
              {settingGroups.map((group, groupIndex) => (
                <motion.div
                  key={group.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.05 }}
                >
                  <div className="px-4 py-2 bg-muted/30">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.title}
                    </h4>
                  </div>
                  {group.items.map((item, index) =>
                    renderSettingItem(item as SettingItem, index)
                  )}
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          {/* Sub-panel overlay */}
          <AnimatePresence>{activeSubPanel && renderSubPanel()}</AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
};

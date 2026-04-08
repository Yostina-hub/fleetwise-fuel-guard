import { motion } from "framer-motion";
import { Battery, Zap, Signal, Satellite, Thermometer, Shield, Wifi, WifiOff } from "lucide-react";

interface TelemetryGridProps {
  telemetry: any;
  isOnline: boolean;
}

const TelemetryCell = ({ icon: Icon, label, value, unit, status, delay = 0 }: {
  icon: any; label: string; value: string | number | null; unit?: string; status?: "ok" | "warn" | "danger" | "neutral"; delay?: number;
}) => {
  const statusColor = {
    ok: "from-success/10 to-success/5 border-success/20",
    warn: "from-warning/10 to-warning/5 border-warning/20",
    danger: "from-destructive/10 to-destructive/5 border-destructive/20",
    neutral: "from-muted/50 to-muted/30 border-border/50",
  }[status || "neutral"];

  const iconColor = {
    ok: "text-success",
    warn: "text-warning",
    danger: "text-destructive",
    neutral: "text-muted-foreground",
  }[status || "neutral"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${statusColor} p-3 backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        {status === "danger" && (
          <motion.div
            className="h-2 w-2 rounded-full bg-destructive"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </div>
      <div className="mt-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold mt-0.5">
          {value ?? "—"}{unit && <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>}
        </p>
      </div>
    </motion.div>
  );
};

const TelemetryGrid = ({ telemetry, isOnline }: TelemetryGridProps) => {
  if (!telemetry) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const batteryVal = telemetry.battery_voltage != null ? Number(telemetry.battery_voltage) : null;
  const extVal = telemetry.external_voltage != null ? Number(telemetry.external_voltage) : null;
  const gsmVal = telemetry.gsm_signal_strength;
  const satVal = telemetry.gps_satellites_count;
  const temp1 = telemetry.temperature_1 != null ? Number(telemetry.temperature_1) : null;
  const jamming = telemetry.gps_jamming_detected;
  const spoofing = telemetry.gps_spoofing_detected;

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      <TelemetryCell
        icon={isOnline ? Wifi : WifiOff}
        label="Connection"
        value={isOnline ? "Online" : "Offline"}
        status={isOnline ? "ok" : "danger"}
        delay={0}
      />
      <TelemetryCell
        icon={Battery}
        label="Battery"
        value={batteryVal?.toFixed(1) ?? null}
        unit="V"
        status={batteryVal != null ? (batteryVal > 3.6 ? "ok" : batteryVal > 3.2 ? "warn" : "danger") : "neutral"}
        delay={0.05}
      />
      <TelemetryCell
        icon={Zap}
        label="Ext. Power"
        value={extVal?.toFixed(1) ?? null}
        unit="V"
        status={extVal != null ? (extVal > 11 ? "ok" : extVal > 9 ? "warn" : "danger") : "neutral"}
        delay={0.1}
      />
      <TelemetryCell
        icon={Signal}
        label="GSM Signal"
        value={gsmVal ?? null}
        unit="%"
        status={gsmVal != null ? (gsmVal > 50 ? "ok" : gsmVal > 20 ? "warn" : "danger") : "neutral"}
        delay={0.15}
      />
      <TelemetryCell
        icon={Satellite}
        label="Satellites"
        value={satVal ?? null}
        status={satVal != null ? (satVal > 6 ? "ok" : satVal > 3 ? "warn" : "danger") : "neutral"}
        delay={0.2}
      />
      <TelemetryCell
        icon={Thermometer}
        label="Temperature"
        value={temp1?.toFixed(1) ?? null}
        unit="°C"
        status={temp1 != null ? (temp1 < 60 ? "ok" : temp1 < 80 ? "warn" : "danger") : "neutral"}
        delay={0.25}
      />
      {(jamming || spoofing) && (
        <TelemetryCell
          icon={Shield}
          label="Security"
          value={jamming ? "Jamming!" : "Spoofing!"}
          status="danger"
          delay={0.3}
        />
      )}
    </div>
  );
};

export default TelemetryGrid;

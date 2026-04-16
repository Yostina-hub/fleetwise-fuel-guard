import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CAPABILITY_LABELS, COMMAND_LABELS } from "@/data/deviceCompatibilityProfiles";
import type { DeviceCompatibilityProfile } from "@/hooks/useDeviceCompatibility";
import { Cpu, Radio, Terminal, Activity } from "lucide-react";

interface DeviceProfileCardProps {
  profile: DeviceCompatibilityProfile;
  compact?: boolean;
}

export const DeviceProfileCard = ({ profile, compact = false }: DeviceProfileCardProps) => {
  const capabilities = profile.capabilities as Record<string, unknown>;
  const activeCapabilities = Object.entries(capabilities).filter(
    ([key, val]) => val === true && CAPABILITY_LABELS[key]
  );
  const numericCapabilities = Object.entries(capabilities).filter(
    ([, val]) => typeof val === "number"
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium">{profile.vendor} {profile.model_name}</span>
          <Badge variant="outline" className="text-xs">{profile.protocol_name}</Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          {activeCapabilities.slice(0, 6).map(([key]) => (
            <Badge key={key} variant="secondary" className="text-xs">
              {CAPABILITY_LABELS[key]?.icon} {CAPABILITY_LABELS[key]?.label}
            </Badge>
          ))}
          {activeCapabilities.length > 6 && (
            <Badge variant="secondary" className="text-xs">+{activeCapabilities.length - 6}</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {profile.supported_commands?.slice(0, 4).map((cmd) => (
            <Badge key={cmd} variant="outline" className="text-xs font-mono">
              {COMMAND_LABELS[cmd]?.label ?? cmd}
            </Badge>
          ))}
          {(profile.supported_commands?.length ?? 0) > 4 && (
            <Badge variant="outline" className="text-xs">+{profile.supported_commands.length - 4}</Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            {profile.vendor} {profile.model_name}
          </div>
          <Badge variant="outline">{profile.protocol_name}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Capabilities */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Activity className="w-3 h-3" />
            Capabilities
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeCapabilities.map(([key]) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {CAPABILITY_LABELS[key]?.icon} {CAPABILITY_LABELS[key]?.label}
              </Badge>
            ))}
            {numericCapabilities.map(([key, val]) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {key.replace(/_/g, " ")}: {String(val)}
              </Badge>
            ))}
            {capabilities.waterproof && typeof capabilities.waterproof === "string" && (
              <Badge variant="secondary" className="text-xs">💧 {capabilities.waterproof}</Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Commands */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Terminal className="w-3 h-3" />
            Supported Commands
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.supported_commands?.map((cmd) => (
              <Badge key={cmd} variant="outline" className="text-xs">
                {COMMAND_LABELS[cmd]?.label ?? cmd}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Telemetry Fields */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Cpu className="w-3 h-3" />
            Telemetry Fields ({profile.telemetry_fields?.length ?? 0})
          </div>
          <div className="flex flex-wrap gap-1">
            {profile.telemetry_fields?.slice(0, 12).map((field) => (
              <Badge key={field} variant="secondary" className="text-xs font-mono">
                {field}
              </Badge>
            ))}
            {(profile.telemetry_fields?.length ?? 0) > 12 && (
              <Badge variant="secondary" className="text-xs">
                +{profile.telemetry_fields.length - 12} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

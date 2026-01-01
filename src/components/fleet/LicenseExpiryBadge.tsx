import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";

interface LicenseExpiryBadgeProps {
  expiryDate: string | null | undefined;
  showDays?: boolean;
}

export default function LicenseExpiryBadge({ expiryDate, showDays = true }: LicenseExpiryBadgeProps) {
  if (!expiryDate) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No Expiry Set
      </Badge>
    );
  }

  const today = new Date();
  const expiry = parseISO(expiryDate);
  const daysUntilExpiry = differenceInDays(expiry, today);

  if (daysUntilExpiry < 0) {
    // Expired
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              Expired
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Expired on {format(expiry, "MMM d, yyyy")}</p>
            <p className="text-destructive">Expired {Math.abs(daysUntilExpiry)} days ago</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (daysUntilExpiry <= 30) {
    // Expiring soon (within 30 days)
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
              <Clock className="w-3 h-3" />
              {showDays ? `${daysUntilExpiry}d` : "Expiring"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Expires on {format(expiry, "MMM d, yyyy")}</p>
            <p className="text-warning">Only {daysUntilExpiry} days remaining</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (daysUntilExpiry <= 90) {
    // Expiring within 90 days
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {showDays ? `${daysUntilExpiry}d` : format(expiry, "MMM yyyy")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Expires on {format(expiry, "MMM d, yyyy")}</p>
            <p>{daysUntilExpiry} days remaining</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Valid for more than 90 days
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-success/10 text-success border-success/20 gap-1">
            <CheckCircle className="w-3 h-3" />
            Valid
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Expires on {format(expiry, "MMM d, yyyy")}</p>
          <p className="text-success">{daysUntilExpiry} days remaining</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

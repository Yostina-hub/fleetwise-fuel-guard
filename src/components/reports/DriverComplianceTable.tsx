import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, CheckCircle, FileWarning } from "lucide-react";
import { format, differenceInDays, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  employee_id?: string;
  license_number: string;
  license_expiry?: string;
  license_class?: string;
  medical_certificate_expiry?: string;
  status?: string;
}

interface DriverComplianceTableProps {
  drivers: Driver[];
}

export const DriverComplianceTable = ({ drivers }: DriverComplianceTableProps) => {
  const today = new Date();

  // Add compliance status to each driver
  const driversWithCompliance = drivers.map(driver => {
    const licenseExpired = driver.license_expiry && isBefore(new Date(driver.license_expiry), today);
    const licenseExpiringSoon = driver.license_expiry && 
      !licenseExpired && 
      differenceInDays(new Date(driver.license_expiry), today) <= 30;
    
    const medicalExpired = driver.medical_certificate_expiry && 
      isBefore(new Date(driver.medical_certificate_expiry), today);
    const medicalExpiringSoon = driver.medical_certificate_expiry && 
      !medicalExpired && 
      differenceInDays(new Date(driver.medical_certificate_expiry), today) <= 30;

    const hasIssues = licenseExpired || medicalExpired;
    const hasWarnings = licenseExpiringSoon || medicalExpiringSoon;

    return {
      ...driver,
      licenseExpired,
      licenseExpiringSoon,
      medicalExpired,
      medicalExpiringSoon,
      hasIssues,
      hasWarnings,
      complianceStatus: hasIssues ? "non_compliant" : hasWarnings ? "warning" : "compliant",
    };
  }).sort((a, b) => {
    // Sort by compliance status: non_compliant first, then warning, then compliant
    const order = { non_compliant: 0, warning: 1, compliant: 2 };
    return order[a.complianceStatus] - order[b.complianceStatus];
  });

  if (drivers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Drivers Found</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No driver compliance data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const nonCompliantCount = driversWithCompliance.filter(d => d.complianceStatus === "non_compliant").length;
  const warningCount = driversWithCompliance.filter(d => d.complianceStatus === "warning").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Driver Compliance Report ({drivers.length})
          </CardTitle>
          <div className="flex items-center gap-3 text-sm">
            {nonCompliantCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="w-4 h-4" />
                {nonCompliantCount} Non-Compliant
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <FileWarning className="w-4 h-4" />
                {warningCount} Expiring Soon
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">License</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">License Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Medical Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {driversWithCompliance.map((driver) => (
                <tr key={driver.id} className={cn(
                  "hover:bg-muted/30 transition-colors",
                  driver.hasIssues && "bg-red-500/5"
                )}>
                  <td className="px-4 py-3 font-medium">
                    {driver.first_name} {driver.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {driver.employee_id || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-mono">{driver.license_number}</span>
                    {driver.license_class && (
                      <span className="ml-2 text-muted-foreground">({driver.license_class})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {driver.license_expiry ? (
                      <span className={cn(
                        "flex items-center gap-1",
                        driver.licenseExpired ? "text-red-500" :
                        driver.licenseExpiringSoon ? "text-amber-500" :
                        "text-green-500"
                      )}>
                        {driver.licenseExpired && <AlertTriangle className="w-4 h-4" />}
                        {format(new Date(driver.license_expiry), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {driver.medical_certificate_expiry ? (
                      <span className={cn(
                        "flex items-center gap-1",
                        driver.medicalExpired ? "text-red-500" :
                        driver.medicalExpiringSoon ? "text-amber-500" :
                        "text-green-500"
                      )}>
                        {driver.medicalExpired && <AlertTriangle className="w-4 h-4" />}
                        {format(new Date(driver.medical_certificate_expiry), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {driver.complianceStatus === "compliant" ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500 flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" />
                        Compliant
                      </span>
                    ) : driver.complianceStatus === "warning" ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-600 flex items-center gap-1 w-fit">
                        <FileWarning className="w-3 h-3" />
                        Action Needed
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500 flex items-center gap-1 w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        Non-Compliant
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

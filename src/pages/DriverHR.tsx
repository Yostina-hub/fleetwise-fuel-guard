import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useEmployees, EMPLOYEE_TYPE_LABELS, EMPLOYEE_TYPE_COLORS } from "@/hooks/useEmployees";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, DollarSign, Car, Gift, Search,
  CalendarDays, BarChart3, Wallet, Handshake, LayoutDashboard, Users, X,
} from "lucide-react";

import { HRFinanceDashboard } from "@/components/drivers/HRFinanceDashboard";
import { DriverContractManagement } from "@/components/drivers/DriverContractManagement";
import { DriverCostAllocation } from "@/components/drivers/DriverCostAllocation";
import { DriverVehicleHistory } from "@/components/drivers/DriverVehicleHistory";
import { DriverRewardsRecognition } from "@/components/drivers/DriverRewardsRecognition";
import { DriverAttendanceManagement } from "@/components/drivers/DriverAttendanceManagement";
import { DriverPerformanceKPIs } from "@/components/drivers/DriverPerformanceKPIs";
import { DriverPayrollManagement } from "@/components/drivers/DriverPayrollManagement";
import { OutsourceContractManagement } from "@/components/drivers/OutsourceContractManagement";
import { useTranslation } from 'react-i18next';

const tabs = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "contracts", label: "Contracts", icon: Briefcase },
  { key: "costs", label: "Cost Allocation", icon: DollarSign },
  { key: "vehicles", label: "Vehicle History", icon: Car, driversOnly: true },
  { key: "attendance", label: "Attendance", icon: CalendarDays },
  { key: "performance", label: "Performance", icon: BarChart3 },
  { key: "payroll", label: "Payroll", icon: Wallet },
  { key: "outsource", label: "Outsource", icon: Handshake },
  { key: "rewards", label: "Rewards", icon: Gift },
];

const DriverHR = () => {
  const { t } = useTranslation();
  const { employees } = useEmployees();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Drilldown listener: widgets dispatch `hr.navigate` to jump into a tab and optionally select an employee.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; employeeId?: string }>).detail || {};
      if (detail.tab) setActiveTab(detail.tab);
      if (detail.employeeId !== undefined) setSelectedEmployeeId(detail.employeeId || "");
    };
    window.addEventListener("hr.navigate", handler);
    return () => window.removeEventListener("hr.navigate", handler);
  }, []);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const employeeName = selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : "";
  const driverId = selectedEmployee?.driver_id || "";

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter(e =>
      e.first_name.toLowerCase().includes(q) || e.last_name.toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q) ||
      EMPLOYEE_TYPE_LABELS[e.employee_type].toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  const clearSelection = () => {
    setSelectedEmployeeId("");
  };

  const renderContent = () => {
    // Vehicle history only for driver-type employees and requires selection
    if (activeTab === "vehicles" && selectedEmployee && !selectedEmployee.driver_id) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center">
          <Car className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Not Applicable</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Vehicle history is only available for driver-type employees.
          </p>
        </motion.div>
      );
    }

    const map: Record<string, JSX.Element> = {
      overview: <HRFinanceDashboard />,
      contracts: <DriverContractManagement driverId={driverId} driverName={employeeName} employeeId={selectedEmployeeId} employees={employees} />,
      costs: <DriverCostAllocation driverId={driverId} driverName={employeeName} employeeId={selectedEmployeeId} employees={employees} />,
      vehicles: <DriverVehicleHistory driverId={driverId} driverName={employeeName} employees={employees} />,
      attendance: <DriverAttendanceManagement driverId={driverId} driverName={employeeName} employeeId={selectedEmployeeId} employees={employees} />,
      performance: <DriverPerformanceKPIs driverId={driverId} driverName={employeeName} employeeId={selectedEmployeeId} employees={employees} />,
      payroll: <DriverPayrollManagement driverId={driverId} driverName={employeeName} employeeId={selectedEmployeeId} employees={employees} />,
      outsource: <OutsourceContractManagement />,
      rewards: <DriverRewardsRecognition />,
    };
    return map[activeTab] || null;
  };

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t('pages.driver_h_r.title', 'HR & Finance')}</h1>
              <p className="text-xs text-muted-foreground">Workforce management, contracts, payroll & rewards</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={selectedEmployeeId || undefined} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="w-[260px] border-0 bg-transparent h-8 text-sm focus:ring-0">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search by name, type, dept..." value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} className="h-8 pl-7 text-xs" />
                  </div>
                </div>
                {filteredEmployees.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={e.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{e.first_name[0]}{e.last_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{e.first_name} {e.last_name}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${EMPLOYEE_TYPE_COLORS[e.employee_type]}`}>
                        {EMPLOYEE_TYPE_LABELS[e.employee_type]}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
                {filteredEmployees.length === 0 && (
                  <div className="py-3 text-center text-xs text-muted-foreground">No employees found</div>
                )}
              </SelectContent>
            </Select>
            {selectedEmployeeId && (
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clearSelection}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin border-b">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab + selectedEmployeeId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="min-h-[400px]">
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default DriverHR;

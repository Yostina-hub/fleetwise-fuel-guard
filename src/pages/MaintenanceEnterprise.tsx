import { useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, Loader2, Ticket, FileSignature, DollarSign, 
  Users, ShoppingCart, ClipboardList, Building2, FileText,
  MessageSquare, CreditCard, ClipboardCheck, ShieldCheck, PackageSearch
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import MaintenanceTicketsTab from "@/components/maintenance-enterprise/MaintenanceTicketsTab";
import MaintenanceContractsTab from "@/components/maintenance-enterprise/MaintenanceContractsTab";
import MaintenanceCostTab from "@/components/maintenance-enterprise/MaintenanceCostTab";
import SupplierProfilesTab from "@/components/maintenance-enterprise/SupplierProfilesTab";
import PurchaseOrdersTab from "@/components/maintenance-enterprise/PurchaseOrdersTab";
import SupplierBidsTab from "@/components/maintenance-enterprise/SupplierBidsTab";
import WorkOrderPortalTab from "@/components/maintenance-enterprise/WorkOrderPortalTab";
import MaintenanceRequestsTab from "@/components/maintenance-enterprise/MaintenanceRequestsTab";
import SupplierCommunicationTab from "@/components/maintenance-enterprise/SupplierCommunicationTab";
import SupplierPaymentsTab from "@/components/maintenance-enterprise/SupplierPaymentsTab";
import PostMaintenanceTab from "@/components/maintenance-enterprise/PostMaintenanceTab";
import FleetOpsReviewTab from "@/components/maintenance-enterprise/FleetOpsReviewTab";
import MaintenanceSectionTab from "@/components/maintenance-enterprise/MaintenanceSectionTab";
import SCDSourcingTab from "@/components/maintenance-enterprise/SCDSourcingTab";
import SupplierWorkflowTasksTab from "@/components/maintenance-enterprise/SupplierWorkflowTasksTab";

const MaintenanceEnterprise = () => {
  const { organizationId, loading: orgLoading } = useOrganization();
  const { hasAnyRole, isSuperAdmin, loading: permsLoading } = usePermissions();
  const [activeTab, setActiveTab] = useState("requests");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Roles allowed to see the full enterprise suite (tickets, contracts, POs, suppliers, etc.)
  const canManageEnterprise =
    isSuperAdmin ||
    hasAnyRole([
      "org_admin",
      "fleet_owner",
      "operations_manager",
      "fleet_manager",
      "maintenance_lead",
      "technician",
      "mechanic",
      "auditor",
    ]);

  if (orgLoading || permsLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center" role="status">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading enterprise maintenance...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Restricted view: drivers and other limited roles only see Maintenance Requests
  if (!canManageEnterprise) {
    return (
      <Layout>
        <div className="p-4 md:p-8 space-y-6 animate-fade-in">
          <div className="flex items-center gap-4 slide-in-right">
            <div className="p-4 rounded-2xl glass-strong glow">
              <FileText className="w-8 h-8 text-primary float-animation" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold gradient-text">
                Maintenance Requests
              </h1>
              <p className="text-muted-foreground mt-1 text-lg">
                Submit and track maintenance requests for your assigned vehicle
              </p>
            </div>
          </div>
          <MaintenanceRequestsTab />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 slide-in-right">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Building2 className="w-8 h-8 text-primary float-animation" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold gradient-text">
              Enterprise Maintenance Suite
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Requests • Tickets • Work Orders • Suppliers • Payments • Inspections
            </p>
          </div>
        </div>

        <div ref={tabsRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="requests" className="gap-1.5 text-xs md:text-sm">
                <FileText className="w-4 h-4" /> Requests
              </TabsTrigger>
              <TabsTrigger value="fleet-ops" className="gap-1.5 text-xs md:text-sm">
                <ShieldCheck className="w-4 h-4" /> Fleet Ops Review
              </TabsTrigger>
              <TabsTrigger value="maint-section" className="gap-1.5 text-xs md:text-sm">
                <Wrench className="w-4 h-4" /> Maint. Section
              </TabsTrigger>
              <TabsTrigger value="scd-sourcing" className="gap-1.5 text-xs md:text-sm">
                <PackageSearch className="w-4 h-4" /> SCD Sourcing
              </TabsTrigger>
              <TabsTrigger value="supplier-tasks" className="gap-1.5 text-xs md:text-sm">
                <Wrench className="w-4 h-4" /> Supplier Tasks
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-1.5 text-xs md:text-sm">
                <Ticket className="w-4 h-4" /> Tickets
              </TabsTrigger>
              <TabsTrigger value="contracts" className="gap-1.5 text-xs md:text-sm">
                <FileSignature className="w-4 h-4" /> Contracts
              </TabsTrigger>
              <TabsTrigger value="costs" className="gap-1.5 text-xs md:text-sm">
                <DollarSign className="w-4 h-4" /> Costs
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="gap-1.5 text-xs md:text-sm">
                <Users className="w-4 h-4" /> Suppliers
              </TabsTrigger>
              <TabsTrigger value="purchase-orders" className="gap-1.5 text-xs md:text-sm">
                <ShoppingCart className="w-4 h-4" /> POs
              </TabsTrigger>
              <TabsTrigger value="bids" className="gap-1.5 text-xs md:text-sm">
                <ClipboardList className="w-4 h-4" /> RFQ/Bids
              </TabsTrigger>
              <TabsTrigger value="portal" className="gap-1.5 text-xs md:text-sm">
                <Wrench className="w-4 h-4" /> Portal
              </TabsTrigger>
              <TabsTrigger value="communication" className="gap-1.5 text-xs md:text-sm">
                <MessageSquare className="w-4 h-4" /> Messages
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5 text-xs md:text-sm">
                <CreditCard className="w-4 h-4" /> Payments
              </TabsTrigger>
              <TabsTrigger value="post-inspection" className="gap-1.5 text-xs md:text-sm">
                <ClipboardCheck className="w-4 h-4" /> Inspection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              <MaintenanceRequestsTab />
            </TabsContent>
            <TabsContent value="fleet-ops">
              <FleetOpsReviewTab />
            </TabsContent>
            <TabsContent value="maint-section">
              <MaintenanceSectionTab />
            </TabsContent>
            <TabsContent value="scd-sourcing">
              <SCDSourcingTab />
            </TabsContent>
            <TabsContent value="supplier-tasks">
              <SupplierWorkflowTasksTab />
            </TabsContent>
            <TabsContent value="tickets">
              <MaintenanceTicketsTab />
            </TabsContent>
            <TabsContent value="contracts">
              <MaintenanceContractsTab />
            </TabsContent>
            <TabsContent value="costs">
              <MaintenanceCostTab />
            </TabsContent>
            <TabsContent value="suppliers">
              <SupplierProfilesTab />
            </TabsContent>
            <TabsContent value="purchase-orders">
              <PurchaseOrdersTab />
            </TabsContent>
            <TabsContent value="bids">
              <SupplierBidsTab />
            </TabsContent>
            <TabsContent value="portal">
              <WorkOrderPortalTab />
            </TabsContent>
            <TabsContent value="communication">
              <SupplierCommunicationTab />
            </TabsContent>
            <TabsContent value="payments">
              <SupplierPaymentsTab />
            </TabsContent>
            <TabsContent value="post-inspection">
              <PostMaintenanceTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default MaintenanceEnterprise;

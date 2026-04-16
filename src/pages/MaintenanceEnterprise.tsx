import { useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, Loader2, Ticket, FileSignature, DollarSign, 
  Users, ShoppingCart, ClipboardList, Building2, FileText,
  MessageSquare, CreditCard, ClipboardCheck
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

const MaintenanceEnterprise = () => {
  const { organizationId, loading: orgLoading } = useOrganization();
  const [activeTab, setActiveTab] = useState("requests");
  const tabsRef = useRef<HTMLDivElement>(null);

  if (orgLoading) {
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

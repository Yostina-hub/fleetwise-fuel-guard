import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Tag, CalendarCheck, FileText, AlertTriangle, Truck } from "lucide-react";
import { PriceCatalogTab } from "@/components/outsource/PriceCatalogTab";
import { PaymentRequestsTab } from "@/components/outsource/PaymentRequestsTab";
import { CapacityAlertsTab } from "@/components/outsource/CapacityAlertsTab";
import { AttendanceTab } from "@/components/outsource/AttendanceTab";

const OutsourceManagement = () => {
  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Outsource Management</h1>
            <p className="text-sm text-muted-foreground">Suppliers, rentals, catalogs, attendance, and payment workflow.</p>
          </div>
        </div>

        <Tabs defaultValue="capacity" className="space-y-4">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl">
            <TabsTrigger value="capacity"><AlertTriangle className="w-4 h-4 mr-1" /> Capacity</TabsTrigger>
            <TabsTrigger value="suppliers"><Users className="w-4 h-4 mr-1" /> Suppliers</TabsTrigger>
            <TabsTrigger value="resources"><Truck className="w-4 h-4 mr-1" /> Resources</TabsTrigger>
            <TabsTrigger value="catalog"><Tag className="w-4 h-4 mr-1" /> Catalog</TabsTrigger>
            <TabsTrigger value="attendance"><CalendarCheck className="w-4 h-4 mr-1" /> Attendance</TabsTrigger>
            <TabsTrigger value="payments"><FileText className="w-4 h-4 mr-1" /> Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="capacity"><CapacityAlertsTab /></TabsContent>
          <TabsContent value="suppliers">
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              Supplier list & profiles are managed in <a href="/maintenance-enterprise" className="text-primary underline">Maintenance → Suppliers</a>.
              They are reused here as the source of truth (driver/vehicle outsource suppliers).
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="resources">
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              Rental vehicles registry: <a href="/rental-vehicles" className="text-primary underline">Open Rental Vehicles</a>.
              Outsource driver contracts are managed in the <a href="/driver-management" className="text-primary underline">Driver Management hub</a>.
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="catalog"><PriceCatalogTab /></TabsContent>
          <TabsContent value="attendance"><AttendanceTab /></TabsContent>
          <TabsContent value="payments"><PaymentRequestsTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default OutsourceManagement;

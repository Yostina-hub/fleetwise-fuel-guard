import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Package, Navigation, Clock } from "lucide-react";
import DispatchJobsTab from "@/components/dispatch/DispatchJobsTab";

const Dispatch = () => {
  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Truck className="w-8 h-8 text-primary float-animation" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text">Dispatch & Operations</h1>
            <p className="text-muted-foreground mt-1 text-lg">Manage delivery jobs, assignments, and proof of delivery</p>
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="jobs" className="gap-2">
              <Package className="w-4 h-4" aria-hidden="true" />
              Dispatch Jobs
            </TabsTrigger>
            <TabsTrigger value="tracking" className="gap-2">
              <Navigation className="w-4 h-4" aria-hidden="true" />
              Live Tracking
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="w-4 h-4" aria-hidden="true" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <DispatchJobsTab />
          </TabsContent>
          <TabsContent value="tracking">
            <div className="text-center py-12 text-muted-foreground" role="status" aria-label="Live tracking section">
              <Navigation className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
              <p>Live tracking view coming soon</p>
            </div>
          </TabsContent>
          <TabsContent value="history">
            <div className="text-center py-12 text-muted-foreground" role="status" aria-label="Dispatch history section">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
              <p>Dispatch history coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dispatch;

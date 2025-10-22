import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Route, MapPin } from "lucide-react";
import RoutesTab from "@/components/routes/RoutesTab";
import CustomerSitesTab from "@/components/routes/CustomerSitesTab";

const RoutesPage = () => {
  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Route className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Routes & Dispatch</h1>
          <p className="text-muted-foreground">
            Manage planned routes and customer delivery locations
          </p>
        </div>
      </div>

      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="routes" className="gap-2">
            <Route className="h-4 w-4" />
            Routes
          </TabsTrigger>
          <TabsTrigger value="sites" className="gap-2">
            <MapPin className="h-4 w-4" />
            Customer Sites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes">
          <Card className="p-6">
            <RoutesTab />
          </Card>
        </TabsContent>

        <TabsContent value="sites">
          <Card className="p-6">
            <CustomerSitesTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
};

export default RoutesPage;

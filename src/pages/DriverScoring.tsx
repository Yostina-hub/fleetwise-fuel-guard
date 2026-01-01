import Layout from "@/components/Layout";
import { DriverScoringTab } from "@/components/fleet/DriverScoringTab";
import { AllDriversCoachingTab } from "@/components/fleet/AllDriversCoachingTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, TrendingUp, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DriverScoring = () => {
  const navigate = useNavigate();
  
  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/drivers")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Driver Behavior Scoring
              </h1>
              <p className="text-muted-foreground mt-1">
                Safety scores, risk analysis, and performance tracking
              </p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/drivers")}>
            <Users className="w-4 h-4" />
            Back to Drivers
          </Button>
        </div>
        
        <Tabs defaultValue="scoring" className="space-y-6">
          <TabsList>
            <TabsTrigger value="scoring" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Scoring
            </TabsTrigger>
            <TabsTrigger value="coaching" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Coaching
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="scoring">
            <DriverScoringTab />
          </TabsContent>
          
          <TabsContent value="coaching">
            <AllDriversCoachingTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DriverScoring;

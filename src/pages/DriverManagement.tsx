import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDrivers } from "@/hooks/useDrivers";
import { DriverLeaderboard } from "@/components/drivers/DriverLeaderboard";
import { DriverAchievementsPanel } from "@/components/drivers/DriverAchievementsPanel";
import { DriverTrainingPanel } from "@/components/drivers/DriverTrainingPanel";
import { DriverFatiguePanel } from "@/components/drivers/DriverFatiguePanel";
import { DriverInsightsPanel } from "@/components/drivers/DriverInsightsPanel";
import { DriverAvailabilityBoard } from "@/components/drivers/DriverAvailabilityBoard";
import { DriverOnboardingChecklist } from "@/components/drivers/DriverOnboardingChecklist";
import { DriverDocumentVault } from "@/components/drivers/DriverDocumentVault";
import { DriverLicenseTracker } from "@/components/drivers/DriverLicenseTracker";
import { DriverHierarchyView } from "@/components/drivers/DriverHierarchyView";
import { DriverVehicleHistory } from "@/components/drivers/DriverVehicleHistory";
import {
  Trophy,
  Award,
  BookOpen,
  Brain,
  Clock,
  Users,
  UserCircle,
  Radio,
  ClipboardCheck,
  FolderOpen,
  CreditCard,
  FolderTree,
  Car,
} from "lucide-react";

const DriverManagement = () => {
  const { drivers, loading } = useDrivers();
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("availability");

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
  const driverName = selectedDriver
    ? `${selectedDriver.first_name} ${selectedDriver.last_name}`
    : "";

  // Tabs that require a driver to be selected
  const driverRequiredTabs = ["achievements", "training", "fatigue", "insights", "onboarding", "documents", "vehicle-history"];
  const needsDriver = driverRequiredTabs.includes(activeTab);

  // Fleet-wide tabs (no driver selection needed)
  const fleetWideTabs = ["availability", "leaderboard", "licenses", "hierarchy"];

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Driver Management Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Lifecycle, compliance, availability, gamification & AI insights
            </p>
          </div>

          {/* Driver Selector */}
          <div className="flex items-center gap-3">
            <UserCircle className="w-5 h-5 text-muted-foreground" />
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a driver..." />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={d.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {d.first_name[0]}
                          {d.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {d.first_name} {d.last_name}
                      </span>
                      <Badge
                        variant={d.status === "active" ? "default" : "secondary"}
                        className="text-[10px] ml-auto"
                      >
                        {d.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5 lg:grid-cols-11 gap-1">
              {/* Fleet-wide tabs */}
              <TabsTrigger value="availability" className="gap-1.5 text-xs">
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Availability</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1.5 text-xs">
                <Trophy className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Leaderboard</span>
              </TabsTrigger>
              <TabsTrigger value="licenses" className="gap-1.5 text-xs">
                <CreditCard className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Licenses</span>
              </TabsTrigger>
              <TabsTrigger value="hierarchy" className="gap-1.5 text-xs">
                <FolderTree className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Groups</span>
              </TabsTrigger>
              {/* Driver-specific tabs */}
              <TabsTrigger value="onboarding" className="gap-1.5 text-xs">
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Onboarding</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5 text-xs">
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="vehicle-history" className="gap-1.5 text-xs">
                <Car className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Vehicles</span>
              </TabsTrigger>
              <TabsTrigger value="achievements" className="gap-1.5 text-xs">
                <Award className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Achievements</span>
              </TabsTrigger>
              <TabsTrigger value="training" className="gap-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Training</span>
              </TabsTrigger>
              <TabsTrigger value="fatigue" className="gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Fatigue</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1.5 text-xs">
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">AI Insights</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Fleet-wide tabs */}
          <TabsContent value="availability">
            <DriverAvailabilityBoard />
          </TabsContent>
          <TabsContent value="leaderboard">
            <DriverLeaderboard />
          </TabsContent>
          <TabsContent value="licenses">
            <DriverLicenseTracker />
          </TabsContent>
          <TabsContent value="hierarchy">
            <DriverHierarchyView />
          </TabsContent>

          {/* Driver-specific tabs */}
          {needsDriver && !selectedDriverId ? (
            <div className="mt-6">
              <Card>
                <CardContent className="py-16 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-semibold mb-2">Select a Driver</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Use the driver selector above to view their{" "}
                    {activeTab === "onboarding"
                      ? "onboarding/offboarding checklist"
                      : activeTab === "documents"
                        ? "document qualification file (DQF)"
                        : activeTab === "vehicle-history"
                          ? "vehicle assignment history"
                          : activeTab === "achievements"
                            ? "achievements and XP progress"
                            : activeTab === "training"
                              ? "training courses and certifications"
                              : activeTab === "fatigue"
                                ? "fatigue indicators and HOS compliance"
                                : "AI-powered insights and coaching tips"}
                    .
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <TabsContent value="onboarding">
                <DriverOnboardingChecklist driverId={selectedDriverId} driverName={driverName} />
              </TabsContent>
              <TabsContent value="documents">
                <DriverDocumentVault driverId={selectedDriverId} driverName={driverName} />
              </TabsContent>
              <TabsContent value="vehicle-history">
                <DriverVehicleHistory driverId={selectedDriverId} driverName={driverName} />
              </TabsContent>
              <TabsContent value="achievements">
                <DriverAchievementsPanel
                  driverId={selectedDriverId}
                  driverName={driverName}
                />
              </TabsContent>
              <TabsContent value="training">
                <DriverTrainingPanel driverId={selectedDriverId} />
              </TabsContent>
              <TabsContent value="fatigue">
                <DriverFatiguePanel driverId={selectedDriverId} />
              </TabsContent>
              <TabsContent value="insights">
                <DriverInsightsPanel driverId={selectedDriverId} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default DriverManagement;

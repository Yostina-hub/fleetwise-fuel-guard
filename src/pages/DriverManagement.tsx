import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Trophy,
  Award,
  BookOpen,
  Brain,
  Clock,
  Users,
  UserCircle,
} from "lucide-react";

const DriverManagement = () => {
  const { drivers, loading } = useDrivers();
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("leaderboard");

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
  const driverName = selectedDriver
    ? `${selectedDriver.first_name} ${selectedDriver.last_name}`
    : "";

  const driverRequiredTabs = ["achievements", "training", "fatigue", "insights"];
  const needsDriver = driverRequiredTabs.includes(activeTab);

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
              Gamification, training, fatigue monitoring & AI insights
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Achievements</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Training</span>
            </TabsTrigger>
            <TabsTrigger value="fatigue" className="gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Fatigue & HOS</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">AI Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* Leaderboard — fleet-wide, no driver selection needed */}
          <TabsContent value="leaderboard">
            <DriverLeaderboard />
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
                    {activeTab === "achievements"
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

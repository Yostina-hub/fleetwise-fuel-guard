import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Truck, 
  MapPin, 
  Fuel, 
  AlertTriangle, 
  FileText, 
  Settings,
  User,
  Heart,
} from "lucide-react";
import { DriverMobileView } from "@/components/driver/DriverMobileView";
import { useDispatchJobs, DispatchJob } from "@/hooks/useDispatchJobs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { WellnessCheckForm } from "@/components/drivers/WellnessCheckForm";
import { WellnessCheckHistory } from "@/components/drivers/WellnessCheckHistory";
import { supabase } from "@/integrations/supabase/client";

// Map hook dispatch job to mobile view format
interface MobileDispatchJob {
  id: string;
  job_number: string;
  status: string;
  priority: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  pickup_location_name: string | null;
  dropoff_location_name: string | null;
  scheduled_pickup_at: string | null;
  scheduled_dropoff_at: string | null;
  cargo_description: string | null;
  special_instructions: string | null;
}

const mapToMobileJob = (job: DispatchJob): MobileDispatchJob => ({
  id: job.id,
  job_number: job.job_number,
  status: job.status,
  priority: job.priority || null,
  customer_name: job.customer_name || null,
  customer_phone: job.customer_phone || null,
  pickup_location_name: job.pickup_location_name || null,
  dropoff_location_name: job.dropoff_location_name || null,
  scheduled_pickup_at: job.scheduled_pickup_at || null,
  scheduled_dropoff_at: job.scheduled_dropoff_at || null,
  cargo_description: job.cargo_description || null,
  special_instructions: job.special_instructions || null,
});

const DriverApp = () => {
  const [activeTab, setActiveTab] = useState("wellness");
  const [driverId, setDriverId] = useState<string | null>(null);
  const { user } = useAuth();
  const { jobs, updateJobStatus, capturePOD } = useDispatchJobs();

  // Fetch the driver ID for the current user
  useEffect(() => {
    async function fetchDriverId() {
      if (!user?.id) return;
      const { data } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setDriverId(data.id);
    }
    fetchDriverId();
  }, [user?.id]);

  // Filter jobs assigned to current driver (for demo, show all dispatched jobs)
  const driverJobs = jobs.filter(j => j.status !== "pending").map(mapToMobileJob);

  const handleAcceptJob = (jobId: string) => {
    updateJobStatus(jobId, "en_route");
    toast.success("Job accepted");
  };

  const handleUpdateStatus = (jobId: string, status: string) => {
    // Map mobile statuses to hook statuses
    const statusMap: Record<string, DispatchJob['status']> = {
      'en_route_pickup': 'en_route',
      'arrived_pickup': 'arrived',
      'en_route_dropoff': 'en_route',
      'arrived_dropoff': 'arrived',
      'completed': 'completed',
    };
    
    const mappedStatus = statusMap[status] || 'en_route';
    updateJobStatus(jobId, mappedStatus);
  };

  const handleCapturePOD = (jobId: string, data: { recipient_name: string; notes: string; photos: string[] }) => {
    capturePOD({
      job_id: jobId,
      captured_at: new Date().toISOString(),
      recipient_name: data.recipient_name,
      notes: data.notes,
      photo_urls: data.photos,
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Mobile-optimized tabs at bottom */}
        <div className="pb-20">
          {activeTab === "wellness" && driverId && (
            <div className="p-4 space-y-4">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Heart className="h-6 w-6 text-primary" />
                Wellness Check
              </h1>
              <WellnessCheckForm driverId={driverId} />
              <WellnessCheckHistory driverId={driverId} limit={5} />
            </div>
          )}

          {activeTab === "jobs" && (
            <DriverMobileView
              jobs={driverJobs}
              onAcceptJob={handleAcceptJob}
              onUpdateStatus={handleUpdateStatus}
              onCapturePOD={handleCapturePOD}
            />
          )}

          {activeTab === "vehicle" && (
            <div className="p-4 space-y-4">
              <h1 className="text-2xl font-bold">My Vehicle</h1>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">KAA 123A</h2>
                      <p className="text-muted-foreground">Toyota Hilux 2022</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Fuel Level</p>
                      <p className="text-lg font-semibold flex items-center gap-1">
                        <Fuel className="w-4 h-4" />
                        75%
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Odometer</p>
                      <p className="text-lg font-semibold">45,230 km</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className="bg-success/20 text-success mt-1">Active</Badge>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Next Service</p>
                      <p className="text-lg font-semibold">In 2,770 km</p>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="p-4 space-y-4">
              <h1 className="text-2xl font-bold">My Documents</h1>
              
              <Card>
                <CardContent className="pt-4 divide-y">
                  <div className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Driver's License</p>
                        <p className="text-xs text-muted-foreground">Expires: Dec 15, 2026</p>
                      </div>
                    </div>
                    <Badge className="bg-success/20 text-success">Valid</Badge>
                  </div>
                  
                  <div className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Medical Certificate</p>
                        <p className="text-xs text-muted-foreground">Expires: Mar 1, 2026</p>
                      </div>
                    </div>
                    <Badge className="bg-success/20 text-success">Valid</Badge>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">PSV Badge</p>
                        <p className="text-xs text-muted-foreground">Expires: Jan 20, 2026</p>
                      </div>
                    </div>
                    <Badge className="bg-warning/20 text-warning">Expiring Soon</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="p-4 space-y-4">
              <h1 className="text-2xl font-bold">Profile</h1>
              
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{user?.email?.split("@")[0] || "Driver"}</h2>
                      <p className="text-muted-foreground text-sm">{user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Employee ID</span>
                      <span className="font-medium">DRV-001</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Safety Score</span>
                      <span className="font-medium text-success">92/100</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Total Trips</span>
                      <span className="font-medium">156</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Total Distance</span>
                      <span className="font-medium">12,450 km</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
          <div className="flex justify-around py-2">
            <button
              onClick={() => setActiveTab("wellness")}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                activeTab === "wellness" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Heart className="w-5 h-5" />
              <span className="text-xs">Wellness</span>
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                activeTab === "jobs" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <MapPin className="w-5 h-5" />
              <span className="text-xs">Jobs</span>
            </button>
            <button
              onClick={() => setActiveTab("vehicle")}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                activeTab === "vehicle" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Truck className="w-5 h-5" />
              <span className="text-xs">Vehicle</span>
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                activeTab === "documents" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs">Docs</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                activeTab === "profile" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-xs">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DriverApp;
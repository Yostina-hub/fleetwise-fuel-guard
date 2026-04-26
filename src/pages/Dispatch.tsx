import { useState, useRef, useMemo } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Package, Navigation, Clock, Loader2, Inbox } from "lucide-react";
import DispatchJobsTab from "@/components/dispatch/DispatchJobsTab";
import DispatchQuickStats from "@/components/dispatch/DispatchQuickStats";
import DispatchQuickActions from "@/components/dispatch/DispatchQuickActions";
import DispatchInsightsCard from "@/components/dispatch/DispatchInsightsCard";
import { DispatchRerouteSuggestions } from "@/components/dispatch/DispatchRerouteSuggestions";
import OperatorInboxTab from "@/components/dispatch/OperatorInboxTab";
import { useDispatchJobs } from "@/hooks/useDispatchJobs";
import { useNavigate } from "react-router-dom";
import { startOfDay, isAfter, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

const Dispatch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { jobs, loading } = useDispatchJobs();
  const [activeTab, setActiveTab] = useState("jobs");
  const tabsRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    if (!jobs) return {
      totalJobs: 0,
      activeJobs: 0,
      completedToday: 0,
      pendingAssignment: 0,
      slaAtRisk: 0,
      onTimeRate: 0,
    };

    const now = new Date();
    const today = startOfDay(now);

    const activeJobs = jobs.filter(j => j.status === "en_route" || j.status === "dispatched" || j.status === "arrived").length;
    const completedToday = jobs.filter(j => j.status === "completed" && j.completed_at && isAfter(parseISO(j.completed_at), today)).length;
    const pendingAssignment = jobs.filter(j => !j.driver_id && j.status !== "completed" && j.status !== "cancelled").length;
    const slaAtRisk = jobs.filter(j => {
      if (!j.sla_deadline_at || j.status === "completed") return false;
      const deadline = parseISO(j.sla_deadline_at);
      const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil <= 2 && hoursUntil > 0;
    }).length;

    const completedWithSla = jobs.filter(j => j.status === "completed" && j.sla_met !== null);
    const onTimeRate = completedWithSla.length > 0
      ? Math.round((completedWithSla.filter(j => j.sla_met).length / completedWithSla.length) * 100)
      : 100;

    return {
      totalJobs: jobs.length,
      activeJobs,
      completedToday,
      pendingAssignment,
      slaAtRisk,
      onTimeRate,
    };
  }, [jobs]);

  if (loading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center" role="status" aria-label="Loading dispatch data">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" aria-hidden="true" />
            <p className="text-muted-foreground">Loading dispatch data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Truck className="w-8 h-8 text-primary float-animation" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold gradient-text">{t('dispatch.title')}</h1>
            <p className="text-muted-foreground mt-1 text-lg">{t('dispatch.jobs')}</p>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <DispatchQuickStats {...stats} />

        {/* Quick Actions */}
        <DispatchQuickActions
          onNewJob={() => {
            setActiveTab('jobs');
            tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          onAssignDriver={() => {
            setActiveTab('jobs');
            tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          onViewMap={() => navigate('/map')}
          onViewPending={() => {
            setActiveTab('jobs');
            tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Re-route suggestions from idle coaching */}
        <DispatchRerouteSuggestions />

        {/* Insights Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DispatchInsightsCard />
          <div className="glass-strong rounded-lg p-6 flex items-center justify-center" role="status">
            <div className="text-center text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
              <p className="font-medium">Delivery Trend Chart</p>
              <p className="text-sm">Coming soon</p>
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <div ref={tabsRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="jobs" className="gap-2">
                <Package className="w-4 h-4" aria-hidden="true" />
                Dispatch Jobs
              </TabsTrigger>
              <TabsTrigger value="inbox" className="gap-2">
                <Inbox className="w-4 h-4" aria-hidden="true" />
                Operator Inbox
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
            <TabsContent value="inbox">
              <OperatorInboxTab />
            </TabsContent>
            <TabsContent value="tracking">
              <div className="text-center py-12 text-muted-foreground" role="status" aria-label="Live tracking section">
                <Navigation className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
                <p>{t('common.comingSoon', 'Coming soon')}</p>
              </div>
            </TabsContent>
            <TabsContent value="history">
              <div className="text-center py-12 text-muted-foreground" role="status" aria-label="Dispatch history section">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
                <p>{t('common.comingSoon', 'Coming soon')}</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Dispatch;

import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download,
  Calendar,
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";

const Reports = () => {
  const reportCategories = [
    {
      name: "Fuel Reports",
      icon: <BarChart3 className="w-6 h-6" />,
      reports: [
        { name: "Fuel Variance Report", description: "Compare sensor vs. purchase data", lastRun: "2025-01-10" },
        { name: "Theft Suspects Log", description: "Suspected theft and leak events", lastRun: "2025-01-09" },
        { name: "Consumption Analysis", description: "Efficiency by vehicle and route", lastRun: "2025-01-08" },
        { name: "Refuel History", description: "Complete refueling logs", lastRun: "2025-01-07" },
      ]
    },
    {
      name: "Operations Reports",
      icon: <TrendingUp className="w-6 h-6" />,
      reports: [
        { name: "Trip Summary", description: "Distance, duration, and stops", lastRun: "2025-01-10" },
        { name: "Utilization Report", description: "Asset usage and idle time", lastRun: "2025-01-09" },
        { name: "Geofence Dwell", description: "Time spent in zones", lastRun: "2025-01-08" },
        { name: "Route Compliance", description: "Deviation and on-time metrics", lastRun: "2025-01-10" },
      ]
    },
    {
      name: "Safety Reports",
      icon: <PieChart className="w-6 h-6" />,
      reports: [
        { name: "Driver Scorecards", description: "Behavior and safety metrics", lastRun: "2025-01-10" },
        { name: "Speeding Violations", description: "Over-speed events by vehicle", lastRun: "2025-01-09" },
        { name: "Harsh Events", description: "Acceleration, braking, cornering", lastRun: "2025-01-08" },
        { name: "Incident Report", description: "Accidents and near-misses", lastRun: "2025-01-05" },
      ]
    },
    {
      name: "Maintenance Reports",
      icon: <LineChart className="w-6 h-6" />,
      reports: [
        { name: "Maintenance Compliance", description: "Schedule adherence rate", lastRun: "2025-01-10" },
        { name: "Cost per KM", description: "Operating expenses analysis", lastRun: "2025-01-09" },
        { name: "Work Order History", description: "Services and repairs log", lastRun: "2025-01-08" },
        { name: "Downtime Analysis", description: "Vehicle availability metrics", lastRun: "2025-01-07" },
      ]
    },
  ];

  const scheduledReports = [
    { name: "Daily Fleet Summary", frequency: "Daily at 6:00 AM", recipients: "operations@fleet.com", format: "PDF" },
    { name: "Weekly Fuel Analysis", frequency: "Monday at 8:00 AM", recipients: "fuel-team@fleet.com", format: "XLSX" },
    { name: "Monthly Cost Report", frequency: "1st of month", recipients: "finance@fleet.com", format: "PDF" },
  ];

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">Generate insights and export data</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              Schedule Report
            </Button>
            <Button className="gap-2">
              <FileText className="w-4 h-4" />
              Custom Report
            </Button>
          </div>
        </div>

        {/* Quick Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Date Range</label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Last 7 Days</Button>
                  <Button variant="outline" size="sm">Last 30 Days</Button>
                  <Button variant="outline" size="sm">This Month</Button>
                  <Button variant="outline" size="sm">Custom</Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Export Format</label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">PDF</Button>
                  <Button variant="outline" size="sm">Excel</Button>
                  <Button variant="outline" size="sm">CSV</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Categories */}
        <div className="space-y-6">
          {reportCategories.map((category) => (
            <Card key={category.name}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    {category.icon}
                  </div>
                  <CardTitle>{category.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.reports.map((report) => (
                    <div
                      key={report.name}
                      className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold">{report.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {report.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                          Last run: {report.lastRun}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-2">
                            <Download className="w-3 h-3" />
                            Export
                          </Button>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Scheduled Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduledReports.map((report) => (
                <div
                  key={report.name}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{report.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {report.frequency} • {report.recipients} • {report.format}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm" variant="outline">Run Now</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">156</div>
                  <div className="text-sm text-muted-foreground">Reports Generated</div>
                  <div className="text-xs text-muted-foreground mt-1">This month</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <Download className="w-6 h-6 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">892</div>
                  <div className="text-sm text-muted-foreground">Total Downloads</div>
                  <div className="text-xs text-muted-foreground mt-1">All time</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold">3</div>
                  <div className="text-sm text-muted-foreground">Scheduled Reports</div>
                  <div className="text-xs text-muted-foreground mt-1">Active</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;

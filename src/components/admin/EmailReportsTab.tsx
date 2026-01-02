import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Play, Mail } from "lucide-react";
import { useEmailReports, EmailReportConfig } from "@/hooks/useEmailReports";
import { useVehicles } from "@/hooks/useVehicles";
import { Checkbox } from "@/components/ui/checkbox";

export const EmailReportsTab = () => {
  const { reportConfigs, isLoading, createReportConfig, updateReportConfig, deleteReportConfig, testReport } = useEmailReports();
  const { vehicles } = useVehicles();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EmailReportConfig | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    frequency: "daily" as "daily" | "weekly",
    day_of_week: 1,
    time_of_day: "08:00",
    recipient_emails: "",
    vehicle_ids: [] as string[],
    include_trend_analysis: true,
    is_active: true,
  });

  const handleSubmit = () => {
    const emailArray = formData.recipient_emails.split(",").map(e => e.trim()).filter(e => e);
    
    if (editingConfig) {
      updateReportConfig.mutate({
        id: editingConfig.id,
        ...formData,
        recipient_emails: emailArray,
      });
    } else {
      createReportConfig.mutate({
        ...formData,
        recipient_emails: emailArray,
      });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      frequency: "daily",
      day_of_week: 1,
      time_of_day: "08:00",
      recipient_emails: "",
      vehicle_ids: [],
      include_trend_analysis: true,
      is_active: true,
    });
    setEditingConfig(null);
  };

  const handleEdit = (config: EmailReportConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      frequency: config.frequency,
      day_of_week: config.day_of_week || 1,
      time_of_day: config.time_of_day,
      recipient_emails: config.recipient_emails.join(", "),
      vehicle_ids: config.vehicle_ids,
      include_trend_analysis: config.include_trend_analysis,
      is_active: config.is_active,
    });
    setIsDialogOpen(true);
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Email Reports</h2>
          <p className="text-muted-foreground">Configure automated speed violation reports</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button aria-label="Create new email report schedule">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create Report Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingConfig ? "Edit" : "Create"} Email Report</DialogTitle>
              <DialogDescription>
                Configure automated email reports for speed violations
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Report Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Daily Fleet Violations Report"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: "daily" | "weekly") => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency === "weekly" && (
                <div className="space-y-2">
                  <Label htmlFor="day_of_week">Day of Week</Label>
                  <Select
                    value={formData.day_of_week.toString()}
                    onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayNames.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="time_of_day">Time of Day</Label>
                <Input
                  id="time_of_day"
                  type="time"
                  value={formData.time_of_day}
                  onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emails">Recipient Emails (comma separated)</Label>
                <Input
                  id="emails"
                  value={formData.recipient_emails}
                  onChange={(e) => setFormData({ ...formData, recipient_emails: e.target.value })}
                  placeholder="manager@company.com, admin@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Select Vehicles</Label>
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                  {vehicles?.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={vehicle.id}
                        checked={formData.vehicle_ids.includes(vehicle.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              vehicle_ids: [...formData.vehicle_ids, vehicle.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              vehicle_ids: formData.vehicle_ids.filter(id => id !== vehicle.id),
                            });
                          }
                        }}
                      />
                      <label htmlFor={vehicle.id} className="text-sm cursor-pointer">
                        {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="trend_analysis"
                  checked={formData.include_trend_analysis}
                  onCheckedChange={(checked) => setFormData({ ...formData, include_trend_analysis: checked })}
                />
                <Label htmlFor="trend_analysis">Include Trend Analysis</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingConfig ? "Update" : "Create"} Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8" role="status" aria-live="polite" aria-label="Loading email reports">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {reportConfigs?.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" aria-hidden="true" />
                      {config.name}
                      {config.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {config.frequency === "daily" ? "Daily" : `Weekly on ${dayNames[config.day_of_week || 0]}`} at {config.time_of_day}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testReport.mutate(config.id)}
                      aria-label={`Test report ${config.name}`}
                    >
                      <Play className="h-4 w-4 mr-1" aria-hidden="true" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(config)}
                      aria-label={`Edit report ${config.name}`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteReportConfig.mutate(config.id)}
                      aria-label={`Delete report ${config.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Recipients:</span>{" "}
                    {config.recipient_emails.join(", ")}
                  </div>
                  <div>
                    <span className="font-medium">Vehicles:</span> {config.vehicle_ids.length} selected
                  </div>
                  <div>
                    <span className="font-medium">Trend Analysis:</span>{" "}
                    {config.include_trend_analysis ? "Enabled" : "Disabled"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {reportConfigs?.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" role="status" aria-label="No email reports configured">
                No email report schedules configured yet
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

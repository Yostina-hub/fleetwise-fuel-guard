import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Calendar, 
  Gauge, 
  Clock, 
  Wrench, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useVehicles } from "@/hooks/useVehicles";
import { format, differenceInDays, isPast } from "date-fns";

const MaintenanceSchedulesTab = () => {
  const { schedules, loading, createSchedule, recordService } = useMaintenanceSchedules();
  const { vehicles } = useVehicles();
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showRecordService, setShowRecordService] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);

  const [newSchedule, setNewSchedule] = useState({
    vehicle_id: '',
    service_type: '',
    interval_type: 'mileage' as const,
    interval_value: 10000,
    priority: 'medium' as const,
    reminder_days_before: 7,
    reminder_km_before: 500,
  });

  const [serviceData, setServiceData] = useState({
    service_date: new Date().toISOString().split('T')[0],
    odometer_km: 0,
    hours: 0,
  });

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const getVehicleOdometer = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.odometer_km || 0;
  };

  const getScheduleStatus = (schedule: typeof schedules[0]) => {
    if (schedule.interval_type === 'calendar' && schedule.next_due_date) {
      const daysUntil = differenceInDays(new Date(schedule.next_due_date), new Date());
      if (daysUntil < 0) return 'overdue';
      if (daysUntil <= (schedule.reminder_days_before || 7)) return 'due_soon';
      return 'scheduled';
    }
    if (schedule.interval_type === 'mileage' && schedule.next_due_odometer) {
      const currentOdo = getVehicleOdometer(schedule.vehicle_id);
      const kmRemaining = schedule.next_due_odometer - currentOdo;
      if (kmRemaining <= 0) return 'overdue';
      if (kmRemaining <= (schedule.reminder_km_before || 500)) return 'due_soon';
      return 'scheduled';
    }
    return 'scheduled';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'due_soon':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Due Soon</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-destructive';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-muted-foreground';
      default:
        return '';
    }
  };

  const handleCreateSchedule = async () => {
    await createSchedule(newSchedule);
    setShowAddSchedule(false);
    setNewSchedule({
      vehicle_id: '',
      service_type: '',
      interval_type: 'mileage',
      interval_value: 10000,
      priority: 'medium',
      reminder_days_before: 7,
      reminder_km_before: 500,
    });
  };

  const handleRecordService = async () => {
    if (!selectedSchedule) return;
    await recordService(
      selectedSchedule, 
      new Date(serviceData.service_date).toISOString(),
      serviceData.odometer_km || undefined,
      serviceData.hours || undefined
    );
    setShowRecordService(false);
    setServiceData({
      service_date: new Date().toISOString().split('T')[0],
      odometer_km: 0,
      hours: 0,
    });
  };

  // Group schedules by status
  const overdueSchedules = schedules.filter(s => getScheduleStatus(s) === 'overdue');
  const dueSoonSchedules = schedules.filter(s => getScheduleStatus(s) === 'due_soon');
  const scheduledSchedules = schedules.filter(s => getScheduleStatus(s) === 'scheduled');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Card className="bg-destructive/5 border-destructive/20 px-4 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="font-semibold text-destructive">{overdueSchedules.length}</span>
              <span className="text-sm text-muted-foreground">Overdue</span>
            </div>
          </Card>
          <Card className="bg-warning/5 border-warning/20 px-4 py-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <span className="font-semibold text-warning">{dueSoonSchedules.length}</span>
              <span className="text-sm text-muted-foreground">Due Soon</span>
            </div>
          </Card>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setShowAddSchedule(true)}
          aria-label="Add new maintenance schedule"
        >
          <Plus className="w-4 h-4" />
          Add Schedule
        </Button>
      </div>

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No maintenance schedules configured</p>
            <Button className="mt-4" onClick={() => setShowAddSchedule(true)}>
              Create Your First Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {[...overdueSchedules, ...dueSoonSchedules, ...scheduledSchedules].map(schedule => {
            const status = getScheduleStatus(schedule);
            const currentOdo = getVehicleOdometer(schedule.vehicle_id);
            
            return (
              <Card key={schedule.id} className={status === 'overdue' ? 'border-destructive/50' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Wrench className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-lg">{schedule.service_type}</span>
                        {getStatusBadge(status)}
                        <span className={`text-xs font-semibold uppercase ${getPriorityColor(schedule.priority)}`}>
                          {schedule.priority}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <span className="font-medium">{getVehiclePlate(schedule.vehicle_id)}</span>
                        <span className="text-muted-foreground capitalize">
                          Every {schedule.interval_value.toLocaleString()} {schedule.interval_type === 'mileage' ? 'km' : schedule.interval_type === 'hours' ? 'hours' : 'days'}
                        </span>
                      </div>

                      {schedule.interval_type === 'mileage' && schedule.next_due_odometer && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Odometer Progress</span>
                            <span className="font-medium">
                              {currentOdo.toLocaleString()} / {schedule.next_due_odometer.toLocaleString()} km
                            </span>
                          </div>
                          <Progress 
                            value={Math.min((currentOdo / schedule.next_due_odometer) * 100, 100)}
                            className={`h-2 ${status === 'overdue' ? '[&>div]:bg-destructive' : status === 'due_soon' ? '[&>div]:bg-warning' : ''}`}
                          />
                        </div>
                      )}

                      {schedule.interval_type === 'calendar' && schedule.next_due_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Due: {format(new Date(schedule.next_due_date), "MMM dd, yyyy")}</span>
                          {isPast(new Date(schedule.next_due_date)) ? (
                            <span className="text-destructive">({Math.abs(differenceInDays(new Date(schedule.next_due_date), new Date()))} days overdue)</span>
                          ) : (
                            <span className="text-muted-foreground">({differenceInDays(new Date(schedule.next_due_date), new Date())} days remaining)</span>
                          )}
                        </div>
                      )}

                      {schedule.last_service_date && (
                        <div className="text-xs text-muted-foreground">
                          Last service: {format(new Date(schedule.last_service_date), "MMM dd, yyyy")}
                          {schedule.last_service_odometer && ` at ${schedule.last_service_odometer.toLocaleString()} km`}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        className="gap-1"
                        onClick={() => {
                          setSelectedSchedule(schedule.id);
                          setServiceData({
                            ...serviceData,
                            odometer_km: currentOdo,
                          });
                          setShowRecordService(true);
                        }}
                        aria-label={`Record service for ${schedule.service_type}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Record Service
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        aria-label={`Edit ${schedule.service_type} schedule`}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Schedule Dialog */}
      <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
        <DialogContent aria-describedby="add-schedule-description">
          <DialogHeader>
            <DialogTitle>Add Maintenance Schedule</DialogTitle>
            <p id="add-schedule-description" className="text-sm text-muted-foreground">
              Create a recurring maintenance schedule for a vehicle.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <Select 
                value={newSchedule.vehicle_id}
                onValueChange={v => setNewSchedule({...newSchedule, vehicle_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number} - {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service Type</Label>
              <Input 
                value={newSchedule.service_type}
                onChange={e => setNewSchedule({...newSchedule, service_type: e.target.value})}
                placeholder="e.g., Oil Change, Tire Rotation"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Interval Type</Label>
                <Select 
                  value={newSchedule.interval_type}
                  onValueChange={v => setNewSchedule({...newSchedule, interval_type: v as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mileage">Mileage (km)</SelectItem>
                    <SelectItem value="hours">Engine Hours</SelectItem>
                    <SelectItem value="calendar">Calendar (days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Interval Value</Label>
                <Input 
                  type="number"
                  value={newSchedule.interval_value}
                  onChange={e => setNewSchedule({...newSchedule, interval_value: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label>Priority</Label>
              <Select 
                value={newSchedule.priority}
                onValueChange={v => setNewSchedule({...newSchedule, priority: v as any})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSchedule(false)}>Cancel</Button>
            <Button onClick={handleCreateSchedule} disabled={!newSchedule.vehicle_id || !newSchedule.service_type}>
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Service Dialog */}
      <Dialog open={showRecordService} onOpenChange={setShowRecordService}>
        <DialogContent aria-describedby="record-service-description">
          <DialogHeader>
            <DialogTitle>Record Service Completion</DialogTitle>
            <p id="record-service-description" className="text-sm text-muted-foreground">
              Log when a scheduled maintenance service was performed.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Service Date</Label>
              <Input 
                type="date"
                value={serviceData.service_date}
                onChange={e => setServiceData({...serviceData, service_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Odometer (km)</Label>
              <Input 
                type="number"
                value={serviceData.odometer_km}
                onChange={e => setServiceData({...serviceData, odometer_km: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label>Engine Hours (if applicable)</Label>
              <Input 
                type="number"
                value={serviceData.hours}
                onChange={e => setServiceData({...serviceData, hours: Number(e.target.value)})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordService(false)}>Cancel</Button>
            <Button onClick={handleRecordService}>Record Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceSchedulesTab;

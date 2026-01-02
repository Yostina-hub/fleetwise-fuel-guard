import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Calendar, 
  Gauge, 
  Clock, 
  Wrench, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  Pencil,
  Trash2,
  Download
} from "lucide-react";
import { useMaintenanceSchedules, MaintenanceSchedule } from "@/hooks/useMaintenanceSchedules";
import { useVehicles } from "@/hooks/useVehicles";
import { format, differenceInDays, isPast } from "date-fns";

const MaintenanceSchedulesTab = () => {
  const { schedules, loading, createSchedule, updateSchedule, deleteSchedule, recordService } = useMaintenanceSchedules();
  const { vehicles } = useVehicles();
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [showRecordService, setShowRecordService] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [newSchedule, setNewSchedule] = useState({
    vehicle_id: '',
    service_type: '',
    interval_type: 'mileage' as const,
    interval_value: 10000,
    priority: 'medium' as const,
    reminder_days_before: 7,
    reminder_km_before: 500,
  });

  const [editSchedule, setEditSchedule] = useState<{
    service_type: string;
    interval_type: 'mileage' | 'hours' | 'calendar';
    interval_value: number;
    priority: 'low' | 'medium' | 'high';
    reminder_days_before: number;
    reminder_km_before: number;
    is_active: boolean;
  }>({
    service_type: '',
    interval_type: 'mileage',
    interval_value: 10000,
    priority: 'medium',
    reminder_days_before: 7,
    reminder_km_before: 500,
    is_active: true,
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

  const getScheduleStatus = (schedule: MaintenanceSchedule) => {
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

  // Filter schedules based on search
  const filteredSchedules = useMemo(() => {
    if (!searchQuery) return schedules;
    const query = searchQuery.toLowerCase();
    return schedules.filter(s => 
      s.service_type.toLowerCase().includes(query) ||
      getVehiclePlate(s.vehicle_id).toLowerCase().includes(query)
    );
  }, [schedules, searchQuery, vehicles]);

  // Group filtered schedules by status
  const overdueSchedules = filteredSchedules.filter(s => getScheduleStatus(s) === 'overdue');
  const dueSoonSchedules = filteredSchedules.filter(s => getScheduleStatus(s) === 'due_soon');
  const scheduledSchedules = filteredSchedules.filter(s => getScheduleStatus(s) === 'scheduled');

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

  const handleEditClick = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setEditSchedule({
      service_type: schedule.service_type,
      interval_type: schedule.interval_type as 'mileage' | 'hours' | 'calendar',
      interval_value: schedule.interval_value,
      priority: schedule.priority as 'low' | 'medium' | 'high',
      reminder_days_before: schedule.reminder_days_before || 7,
      reminder_km_before: schedule.reminder_km_before || 500,
      is_active: schedule.is_active !== false,
    });
    setShowEditSchedule(true);
  };

  const handleUpdateSchedule = async () => {
    if (!selectedSchedule) return;
    await updateSchedule(selectedSchedule.id, editSchedule);
    setShowEditSchedule(false);
    setSelectedSchedule(null);
  };

  const handleDeleteClick = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSchedule) return;
    await deleteSchedule(selectedSchedule.id);
    setShowDeleteConfirm(false);
    setSelectedSchedule(null);
  };

  const handleRecordService = async () => {
    if (!selectedSchedule) return;
    await recordService(
      selectedSchedule.id, 
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

  const handleExportSchedules = () => {
    if (!filteredSchedules.length) return;

    const csvContent = [
      ['Vehicle', 'Service Type', 'Interval Type', 'Interval Value', 'Priority', 'Next Due Date', 'Next Due Odometer', 'Last Service Date', 'Last Service Odometer', 'Status', 'Active'].join(','),
      ...filteredSchedules.map(s => [
        getVehiclePlate(s.vehicle_id),
        s.service_type,
        s.interval_type,
        s.interval_value.toString(),
        s.priority,
        s.next_due_date ? format(new Date(s.next_due_date), 'yyyy-MM-dd') : '',
        s.next_due_odometer?.toString() || '',
        s.last_service_date ? format(new Date(s.last_service_date), 'yyyy-MM-dd') : '',
        s.last_service_odometer?.toString() || '',
        getScheduleStatus(s),
        s.is_active !== false ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-schedules-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" role="status" aria-live="polite" aria-label="Loading maintenance schedules...">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="schedule-search"
              aria-label="Search maintenance schedules"
              placeholder="Search schedules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <div className="flex gap-2">
            <Card className="bg-destructive/5 border-destructive/20 px-4 py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
                <span className="font-semibold text-destructive">{overdueSchedules.length}</span>
                <span className="text-sm text-muted-foreground">Overdue</span>
              </div>
            </Card>
            <Card className="bg-warning/5 border-warning/20 px-4 py-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" aria-hidden="true" />
                <span className="font-semibold text-warning">{dueSoonSchedules.length}</span>
                <span className="text-sm text-muted-foreground">Due Soon</span>
              </div>
            </Card>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="gap-2"
            onClick={handleExportSchedules}
            disabled={filteredSchedules.length === 0}
            aria-label="Export maintenance schedules to CSV"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button 
            className="gap-2" 
            onClick={() => setShowAddSchedule(true)}
            aria-label="Add new maintenance schedule"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Schedule
          </Button>
        </div>
      </div>

      {/* Schedules List */}
      {filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" role="status" aria-label={searchQuery ? "No schedules match your search" : "No maintenance schedules configured"}>
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
            <p>{searchQuery ? "No schedules match your search" : "No maintenance schedules configured"}</p>
            {!searchQuery && (
              <Button className="mt-4" onClick={() => setShowAddSchedule(true)}>
                Create Your First Schedule
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {[...overdueSchedules, ...dueSoonSchedules, ...scheduledSchedules].map(schedule => {
            const status = getScheduleStatus(schedule);
            const currentOdo = getVehicleOdometer(schedule.vehicle_id);
            
            return (
              <Card 
                key={schedule.id}
                role="button"
                tabIndex={0}
                className={`${status === 'overdue' ? 'border-destructive/50' : ''} hover:border-primary/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`}
                onClick={() => handleEditClick(schedule)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEditClick(schedule);
                  }
                }}
                aria-label={`${schedule.service_type} for ${getVehiclePlate(schedule.vehicle_id)}, ${status === 'overdue' ? 'overdue' : status === 'due_soon' ? 'due soon' : 'scheduled'}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Wrench className="w-5 h-5 text-primary" aria-hidden="true" />
                        <span className="font-semibold text-lg">{schedule.service_type}</span>
                        {getStatusBadge(status)}
                        <span className={`text-xs font-semibold uppercase ${getPriorityColor(schedule.priority)}`}>
                          {schedule.priority}
                        </span>
                        {schedule.is_active === false && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
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
                          <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSchedule(schedule);
                          setServiceData({
                            ...serviceData,
                            odometer_km: currentOdo,
                          });
                          setShowRecordService(true);
                        }}
                        aria-label={`Record service for ${schedule.service_type}`}
                      >
                        <CheckCircle className="w-4 h-4" aria-hidden="true" />
                        Record Service
                      </Button>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => { e.stopPropagation(); handleEditClick(schedule); }}
                          aria-label={`Edit ${schedule.service_type} schedule`}
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(schedule); }}
                          aria-label={`Delete ${schedule.service_type} schedule`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Maintenance Schedule</DialogTitle>
            <DialogDescription>
              Create a recurring maintenance schedule for a vehicle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-vehicle">Vehicle</Label>
              <Select 
                value={newSchedule.vehicle_id}
                onValueChange={v => setNewSchedule({...newSchedule, vehicle_id: v})}
              >
                <SelectTrigger id="add-vehicle">
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
              <Label htmlFor="add-service-type">Service Type</Label>
              <Input 
                id="add-service-type"
                value={newSchedule.service_type}
                onChange={e => setNewSchedule({...newSchedule, service_type: e.target.value})}
                placeholder="e.g., Oil Change, Tire Rotation"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-interval-type">Interval Type</Label>
                <Select 
                  value={newSchedule.interval_type}
                  onValueChange={v => setNewSchedule({...newSchedule, interval_type: v as any})}
                >
                  <SelectTrigger id="add-interval-type">
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
                <Label htmlFor="add-interval-value">Interval Value</Label>
                <Input 
                  id="add-interval-value"
                  type="number"
                  value={newSchedule.interval_value}
                  onChange={e => setNewSchedule({...newSchedule, interval_value: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="add-priority">Priority</Label>
              <Select 
                value={newSchedule.priority}
                onValueChange={v => setNewSchedule({...newSchedule, priority: v as any})}
              >
                <SelectTrigger id="add-priority">
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

      {/* Edit Schedule Dialog */}
      <Dialog open={showEditSchedule} onOpenChange={setShowEditSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Maintenance Schedule</DialogTitle>
            <DialogDescription>
              Update the maintenance schedule settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-service-type">Service Type</Label>
              <Input 
                id="edit-service-type"
                value={editSchedule.service_type}
                onChange={e => setEditSchedule({...editSchedule, service_type: e.target.value})}
                placeholder="e.g., Oil Change, Tire Rotation"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-interval-type">Interval Type</Label>
                <Select 
                  value={editSchedule.interval_type}
                  onValueChange={v => setEditSchedule({...editSchedule, interval_type: v as any})}
                >
                  <SelectTrigger id="edit-interval-type">
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
                <Label htmlFor="edit-interval-value">Interval Value</Label>
                <Input 
                  id="edit-interval-value"
                  type="number"
                  value={editSchedule.interval_value}
                  onChange={e => setEditSchedule({...editSchedule, interval_value: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-priority">Priority</Label>
              <Select 
                value={editSchedule.priority}
                onValueChange={v => setEditSchedule({...editSchedule, priority: v as any})}
              >
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-is-active"
                checked={editSchedule.is_active}
                onChange={e => setEditSchedule({...editSchedule, is_active: e.target.checked})}
                className="rounded border-input"
              />
              <Label htmlFor="edit-is-active" className="cursor-pointer">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSchedule(false)}>Cancel</Button>
            <Button onClick={handleUpdateSchedule} disabled={!editSchedule.service_type}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Service Dialog */}
      <Dialog open={showRecordService} onOpenChange={setShowRecordService}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Service Completion</DialogTitle>
            <DialogDescription>
              Log when a scheduled maintenance service was performed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="service-date">Service Date</Label>
              <Input 
                id="service-date"
                type="date"
                value={serviceData.service_date}
                onChange={e => setServiceData({...serviceData, service_date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="service-odometer">Odometer (km)</Label>
              <Input 
                id="service-odometer"
                type="number"
                value={serviceData.odometer_km}
                onChange={e => setServiceData({...serviceData, odometer_km: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="service-hours">Engine Hours (if applicable)</Label>
              <Input 
                id="service-hours"
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

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule for "{selectedSchedule?.service_type}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MaintenanceSchedulesTab;
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Truck, 
  MapPin, 
  Clock, 
  User,
  Phone,
  Package,
  CheckCircle,
  Loader2,
  Navigation,
  Play,
  Square
} from "lucide-react";
import { useDispatchJobs } from "@/hooks/useDispatchJobs";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { format } from "date-fns";
import SLAIndicator from "./SLAIndicator";

const DispatchJobsTab = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const { jobs, loading, createJob, updateJobStatus, assignJob } = useDispatchJobs({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();

  const [newJob, setNewJob] = useState({
    job_type: 'delivery',
    status: 'pending' as const,
    priority: 'normal' as const,
    customer_name: '',
    customer_phone: '',
    pickup_location_name: '',
    dropoff_location_name: '',
    cargo_description: '',
    cargo_weight_kg: 0,
    special_instructions: '',
  });

  const [assignData, setAssignData] = useState({
    vehicle_id: '',
    driver_id: '',
  });

  const getVehiclePlate = (vehicleId?: string) => {
    if (!vehicleId) return "Unassigned";
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return "Unassigned";
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'dispatched':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Dispatched</Badge>;
      case 'en_route':
        return <Badge className="bg-warning/10 text-warning border-warning/20">En Route</Badge>;
      case 'arrived':
        return <Badge className="bg-info/10 text-info border-info/20">Arrived</Badge>;
      case 'completed':
        return <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-warning/10 text-warning border-warning/20">High</Badge>;
      case 'normal':
        return <Badge variant="outline">Normal</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return null;
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      job.job_number.toLowerCase().includes(searchLower) ||
      job.customer_name?.toLowerCase().includes(searchLower) ||
      job.pickup_location_name?.toLowerCase().includes(searchLower) ||
      job.dropoff_location_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleCreateJob = async () => {
    await createJob(newJob);
    setShowCreateDialog(false);
    setNewJob({
      job_type: 'delivery',
      status: 'pending',
      priority: 'normal',
      customer_name: '',
      customer_phone: '',
      pickup_location_name: '',
      dropoff_location_name: '',
      cargo_description: '',
      cargo_weight_kg: 0,
      special_instructions: '',
    });
  };

  const handleAssign = async () => {
    if (!selectedJob) return;
    await assignJob(selectedJob, assignData.vehicle_id, assignData.driver_id);
    setShowAssignDialog(false);
    setAssignData({ vehicle_id: '', driver_id: '' });
  };

  const handleStatusChange = async (jobId: string, newStatus: 'en_route' | 'arrived' | 'completed') => {
    await updateJobStatus(jobId, newStatus);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading dispatch jobs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
              <SelectItem value="en_route">En Route</SelectItem>
              <SelectItem value="arrived">Arrived</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)} aria-label="Create new dispatch job">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Create Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['pending', 'dispatched', 'en_route', 'arrived', 'completed'].map(status => (
          <Card key={status} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter(status)}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {jobs.filter(j => j.status === status).length}
              </div>
              <div className="text-sm text-muted-foreground capitalize">{status.replace('_', ' ')}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground" role="status" aria-label="No dispatch jobs found">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
              <p>No dispatch jobs found</p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map(job => (
            <Card key={job.id} className={job.priority === 'urgent' ? 'border-destructive/50' : ''}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-semibold">{job.job_number}</span>
                      {getStatusBadge(job.status)}
                      {getPriorityBadge(job.priority || undefined)}
                      <Badge variant="outline" className="capitalize">{job.job_type}</Badge>
                      <SLAIndicator 
                        slaDeadline={job.sla_deadline_at} 
                        actualTime={job.completed_at}
                        status={job.status}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pickup */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-success mt-0.5" aria-hidden="true" />
                        <div>
                          <div className="text-xs text-muted-foreground">Pickup</div>
                          <div className="font-medium">{job.pickup_location_name || 'Not specified'}</div>
                          {job.scheduled_pickup_at && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(job.scheduled_pickup_at), "MMM dd, HH:mm")}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Dropoff */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-destructive mt-0.5" aria-hidden="true" />
                        <div>
                          <div className="text-xs text-muted-foreground">Dropoff</div>
                          <div className="font-medium">{job.dropoff_location_name || 'Not specified'}</div>
                          {job.scheduled_dropoff_at && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(job.scheduled_dropoff_at), "MMM dd, HH:mm")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      {job.customer_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          {job.customer_name}
                        </span>
                      )}
                      {job.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          {job.customer_phone}
                        </span>
                      )}
                      {job.cargo_description && (
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          {job.cargo_description}
                          {job.cargo_weight_kg && ` (${job.cargo_weight_kg}kg)`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Truck className="w-4 h-4" aria-hidden="true" />
                        {getVehiclePlate(job.vehicle_id || undefined)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" aria-hidden="true" />
                        {getDriverName(job.driver_id || undefined)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        Created {format(new Date(job.created_at), "MMM dd, HH:mm")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[150px]">
                    {job.status === 'pending' && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedJob(job.id);
                          setShowAssignDialog(true);
                        }}
                      >
                        Assign
                      </Button>
                    )}
                    {job.status === 'dispatched' && (
                      <Button 
                        size="sm" 
                        className="gap-1"
                        onClick={() => handleStatusChange(job.id, 'en_route')}
                      >
                        <Play className="w-4 h-4" aria-hidden="true" />
                        Start Trip
                      </Button>
                    )}
                    {job.status === 'en_route' && (
                      <Button 
                        size="sm"
                        className="gap-1"
                        onClick={() => handleStatusChange(job.id, 'arrived')}
                      >
                        <Navigation className="w-4 h-4" aria-hidden="true" />
                        Mark Arrived
                      </Button>
                    )}
                    {job.status === 'arrived' && (
                      <Button 
                        size="sm"
                        className="gap-1 bg-success hover:bg-success/90"
                        onClick={() => handleStatusChange(job.id, 'completed')}
                      >
                        <CheckCircle className="w-4 h-4" aria-hidden="true" />
                        Complete
                      </Button>
                    )}
                    <Button size="sm" variant="outline">View Details</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Job Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Dispatch Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Job Type</Label>
                <Select 
                  value={newJob.job_type}
                  onValueChange={v => setNewJob({...newJob, job_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select 
                  value={newJob.priority}
                  onValueChange={v => setNewJob({...newJob, priority: v as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name</Label>
                <Input 
                  value={newJob.customer_name}
                  onChange={e => setNewJob({...newJob, customer_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  value={newJob.customer_phone}
                  onChange={e => setNewJob({...newJob, customer_phone: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Pickup Location</Label>
              <Input 
                value={newJob.pickup_location_name}
                onChange={e => setNewJob({...newJob, pickup_location_name: e.target.value})}
                placeholder="Enter pickup address"
              />
            </div>
            <div>
              <Label>Dropoff Location</Label>
              <Input 
                value={newJob.dropoff_location_name}
                onChange={e => setNewJob({...newJob, dropoff_location_name: e.target.value})}
                placeholder="Enter delivery address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cargo Description</Label>
                <Input 
                  value={newJob.cargo_description}
                  onChange={e => setNewJob({...newJob, cargo_description: e.target.value})}
                />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input 
                  type="number"
                  value={newJob.cargo_weight_kg}
                  onChange={e => setNewJob({...newJob, cargo_weight_kg: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label>Special Instructions</Label>
              <Textarea 
                value={newJob.special_instructions}
                onChange={e => setNewJob({...newJob, special_instructions: e.target.value})}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateJob}>Create Job</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vehicle & Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <Select 
                value={assignData.vehicle_id}
                onValueChange={v => setAssignData({...assignData, vehicle_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.status !== 'maintenance').map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number} - {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Driver</Label>
              <Select 
                value={assignData.driver_id}
                onValueChange={v => setAssignData({...assignData, driver_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.filter(d => d.status === 'active').map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignData.vehicle_id || !assignData.driver_id}>
              Assign & Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispatchJobsTab;

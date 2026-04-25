import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TablePagination } from "@/components/reports/TablePagination";
import {
  Plus, Search, Ticket, Clock, User, Car, Loader2, CheckCircle, AlertCircle, ArrowRight
} from "lucide-react";
import { useIncidentTickets } from "@/hooks/useIncidentTickets";
import { SlaCountdownBadge } from "@/components/vehicle-requests/SlaCountdownBadge";
import { useIncidentsManagement } from "@/hooks/useIncidentsManagement";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

const IncidentTicketsTab = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { tickets, loading, createTicket, updateTicketStatus } = useIncidentTickets({
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    ticketType: typeFilter !== "all" ? typeFilter : undefined,
  });
  const { incidents } = useIncidentsManagement();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();

  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    ticket_type: "follow_up",
    priority: "medium",
    incident_id: "",
    vehicle_id: "",
    driver_id: "",
    assigned_to_name: "",
    due_date: "",
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent": return <Badge variant="destructive">Urgent</Badge>;
      case "high": return <Badge className="bg-destructive/20 text-destructive">High</Badge>;
      case "medium": return <Badge className="bg-warning/10 text-warning border-warning/20">Medium</Badge>;
      case "low": return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="outline">Open</Badge>;
      case "in_progress": return <Badge className="bg-primary/10 text-primary border-primary/20">In Progress</Badge>;
      case "pending": return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
      case "resolved": return <Badge className="bg-success/10 text-success border-success/20">Resolved</Badge>;
      case "closed": return <Badge variant="secondary">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      investigation: "Investigation",
      repair: "Repair",
      insurance: "Insurance",
      legal: "Legal",
      follow_up: "Follow-up",
    };
    return <Badge variant="outline" className="capitalize">{labels[type] || type}</Badge>;
  };

  const getVehiclePlate = (id?: string | null) => {
    if (!id) return null;
    return vehicles.find(v => v.id === id)?.plate_number || "Unknown";
  };

  const getDriverName = (id?: string | null) => {
    if (!id) return null;
    const d = drivers.find(d => d.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "Unknown";
  };

  const getIncidentNumber = (id?: string | null) => {
    if (!id) return null;
    return incidents.find(i => i.id === id)?.incident_number || null;
  };

  const filtered = tickets.filter(t => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      t.ticket_number.toLowerCase().includes(s) ||
      t.subject.toLowerCase().includes(s) ||
      t.assigned_to_name?.toLowerCase().includes(s)
    );
  });

  const totalItems = filtered.length;
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, priorityFilter, typeFilter, searchQuery]);

  const handleCreate = async () => {
    if (!newTicket.subject) return;
    await createTicket({
      subject: newTicket.subject,
      description: newTicket.description || undefined,
      ticket_type: newTicket.ticket_type,
      priority: newTicket.priority,
      incident_id: newTicket.incident_id || undefined,
      vehicle_id: newTicket.vehicle_id || undefined,
      driver_id: newTicket.driver_id || undefined,
      assigned_to_name: newTicket.assigned_to_name || undefined,
      due_date: newTicket.due_date || undefined,
    });
    setShowCreateDialog(false);
    setNewTicket({ subject: "", description: "", ticket_type: "follow_up", priority: "medium", incident_id: "", vehicle_id: "", driver_id: "", assigned_to_name: "", due_date: "" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search tickets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="investigation">Investigation</SelectItem>
              <SelectItem value="repair">Repair</SelectItem>
              <SelectItem value="insurance">Insurance</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4" /> Create Ticket
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Tickets Found</h3>
            <p>Create a follow-up ticket to track incident resolution.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginated.map(ticket => (
            <Card key={ticket.id} className={ticket.priority === "urgent" ? "border-destructive/50" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-semibold">{ticket.ticket_number}</span>
                      {getPriorityBadge(ticket.priority)}
                      {getStatusBadge(ticket.status)}
                      {getTypeBadge(ticket.ticket_type)}
                      {ticket.priority === "urgent" && (ticket as any).sla_deadline_at && (
                        <SlaCountdownBadge
                          createdAt={ticket.created_at}
                          slaDueAt={(ticket as any).sla_deadline_at}
                          assignedAt={ticket.status === "resolved" || ticket.status === "closed" ? ticket.updated_at : null}
                          slaBreached={!!(ticket as any).sla_breached_at}
                          operationType="incident_urgent"
                        />
                      )}
                    </div>
                    <p className="text-sm font-medium">{ticket.subject}</p>
                    {ticket.description && <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                      </span>
                      {ticket.assigned_to_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" /> {ticket.assigned_to_name}
                        </span>
                      )}
                      {ticket.vehicle_id && (
                        <span className="flex items-center gap-1">
                          <Car className="w-4 h-4" /> {getVehiclePlate(ticket.vehicle_id)}
                        </span>
                      )}
                      {ticket.incident_id && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> {getIncidentNumber(ticket.incident_id) || "Linked Incident"}
                        </span>
                      )}
                      {ticket.due_date && (
                        <span className={`flex items-center gap-1 ${new Date(ticket.due_date) < new Date() && ticket.status !== "resolved" && ticket.status !== "closed" ? "text-destructive" : ""}`}>
                          Due: {format(new Date(ticket.due_date), "MMM dd, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    {ticket.status === "open" && (
                      <Button size="sm" onClick={() => updateTicketStatus(ticket.id, "in_progress")} className="gap-1">
                        <ArrowRight className="w-4 h-4" /> Start Work
                      </Button>
                    )}
                    {ticket.status === "in_progress" && (
                      <Button size="sm" className="bg-success hover:bg-success/90 gap-1" onClick={() => updateTicketStatus(ticket.id, "resolved")}>
                        <CheckCircle className="w-4 h-4" /> Resolve
                      </Button>
                    )}
                    {ticket.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => updateTicketStatus(ticket.id, "in_progress")}>
                        Resume
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <TablePagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Follow-up Ticket</DialogTitle>
            <DialogDescription>Create an internal ticket to track incident follow-up and resolution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Subject *</Label>
              <Input value={newTicket.subject} onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })} placeholder="Brief ticket subject" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ticket Type</Label>
                <Select value={newTicket.ticket_type} onValueChange={v => setNewTicket({ ...newTicket, ticket_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investigation">Investigation</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newTicket.priority} onValueChange={v => setNewTicket({ ...newTicket, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Linked Incident</Label>
              <Select value={newTicket.incident_id} onValueChange={v => setNewTicket({ ...newTicket, incident_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select incident (optional)" /></SelectTrigger>
                <SelectContent>
                  {incidents.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.incident_number} — {i.description?.slice(0, 40)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle</Label>
                <Select value={newTicket.vehicle_id} onValueChange={v => setNewTicket({ ...newTicket, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Driver</Label>
                <Select value={newTicket.driver_id} onValueChange={v => setNewTicket({ ...newTicket, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assigned To</Label>
                <Input value={newTicket.assigned_to_name} onChange={e => setNewTicket({ ...newTicket, assigned_to_name: e.target.value })} placeholder="Assignee name" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={newTicket.due_date} onChange={e => setNewTicket({ ...newTicket, due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={newTicket.description} onChange={e => setNewTicket({ ...newTicket, description: e.target.value })} placeholder="Detailed description..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTicket.subject}>Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncidentTicketsTab;

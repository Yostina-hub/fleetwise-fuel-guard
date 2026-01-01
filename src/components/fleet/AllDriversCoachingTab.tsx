import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useDrivers } from "@/hooks/useDrivers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, CheckCircle, Clock, Send, User, Filter } from "lucide-react";
import { format } from "date-fns";

interface CoachingNote {
  id: string;
  driver_id: string;
  score_id: string | null;
  coaching_note: string;
  acknowledged_at: string | null;
  acknowledgement_method: string | null;
  created_by: string;
  created_at: string;
}

export function AllDriversCoachingTab() {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const { drivers } = useDrivers();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [newNote, setNewNote] = useState("");
  const [filterDriver, setFilterDriver] = useState<string>("all");

  const { data: allNotes = [], isLoading } = useQuery({
    queryKey: ["all-coaching-notes", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_coaching_acknowledgements")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CoachingNote[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async ({ driverId, note }: { driverId: string; note: string }) => {
      const { error } = await supabase.from("driver_coaching_acknowledgements").insert({
        organization_id: organizationId,
        driver_id: driverId,
        coaching_note: note,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-coaching-notes"] });
      toast({ title: "Coaching note sent" });
      setIsDialogOpen(false);
      setNewNote("");
      setSelectedDriverId("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("driver_coaching_acknowledgements")
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledgement_method: "web",
        })
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-coaching-notes"] });
      toast({ title: "Note acknowledged" });
    },
  });

  const getDriverName = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : "Unknown Driver";
  };

  const getDriverInitials = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? `${driver.first_name[0]}${driver.last_name[0]}` : "??";
  };

  const filteredNotes = filterDriver === "all" 
    ? allNotes 
    : allNotes.filter((n) => n.driver_id === filterDriver);

  const pendingNotes = filteredNotes.filter((n) => !n.acknowledged_at);
  const acknowledgedNotes = filteredNotes.filter((n) => n.acknowledged_at);

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={filterDriver} onValueChange={setFilterDriver}>
            <SelectTrigger className="w-[250px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by driver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.first_name} {driver.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Coaching Note
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{allNotes.length}</div>
                <div className="text-sm text-muted-foreground">Total Notes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingNotes.length}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{acknowledgedNotes.length}</div>
                <div className="text-sm text-muted-foreground">Acknowledged</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Coaching Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No coaching notes yet</p>
              <p className="text-sm">Add feedback to help improve driver performance</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingNotes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-warning" />
                    Pending Acknowledgement ({pendingNotes.length})
                  </h4>
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-3">
                      {pendingNotes.map((note) => (
                        <Card key={note.id} className="p-4 border-warning/30 bg-warning/5">
                          <div className="flex items-start gap-4">
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getDriverInitials(note.driver_id)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{getDriverName(note.driver_id)}</span>
                                <Badge variant="outline" className="text-warning border-warning">
                                  Pending
                                </Badge>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{note.coaching_note}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(note.created_at), "MMM d, yyyy 'at' HH:mm")}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeMutation.mutate(note.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Acknowledge
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {acknowledgedNotes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Acknowledged ({acknowledgedNotes.length})
                  </h4>
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {acknowledgedNotes.map((note) => (
                        <Card key={note.id} className="p-3">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {getDriverInitials(note.driver_id)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{getDriverName(note.driver_id)}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {note.acknowledgement_method || "web"}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1">{note.coaching_note}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Acknowledged {format(new Date(note.acknowledged_at!), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Note Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Coaching Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Driver</label>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger>
                  <User className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Choose a driver..." />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Coaching Note</label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter coaching feedback for the driver..."
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-2">
                This note will be sent to the driver for acknowledgement.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate({ driverId: selectedDriverId, note: newNote })}
              disabled={!selectedDriverId || !newNote.trim() || createMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
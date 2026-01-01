import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, CheckCircle, Clock, Send } from "lucide-react";
import { format } from "date-fns";
import type { Driver } from "@/hooks/useDrivers";

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

interface DriverCoachingTabProps {
  driver: Driver;
}

export function DriverCoachingTab({ driver }: DriverCoachingTabProps) {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["coaching-notes", driver.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_coaching_acknowledgements")
        .select("*")
        .eq("driver_id", driver.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CoachingNote[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (note: string) => {
      const { error } = await supabase.from("driver_coaching_acknowledgements").insert({
        organization_id: organizationId,
        driver_id: driver.id,
        coaching_note: note,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-notes", driver.id] });
      toast({ title: "Coaching note sent" });
      setIsDialogOpen(false);
      setNewNote("");
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
      queryClient.invalidateQueries({ queryKey: ["coaching-notes", driver.id] });
      toast({ title: "Note acknowledged" });
    },
  });

  const pendingNotes = notes.filter((n) => !n.acknowledged_at);
  const acknowledgedNotes = notes.filter((n) => n.acknowledged_at);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Coaching & Feedback
        </CardTitle>
        <Button size="sm" className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Note
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : notes.length === 0 ? (
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
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-3">
                    {pendingNotes.map((note) => (
                      <Card key={note.id} className="p-4 border-warning/30 bg-warning/5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
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
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {acknowledgedNotes.map((note) => (
                      <Card key={note.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm">{note.coaching_note}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Acknowledged {format(new Date(note.acknowledged_at!), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {note.acknowledgement_method || "web"}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Coaching Note</DialogTitle>
            </DialogHeader>
            <div className="py-4">
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newNote)}
                disabled={!newNote.trim() || createMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

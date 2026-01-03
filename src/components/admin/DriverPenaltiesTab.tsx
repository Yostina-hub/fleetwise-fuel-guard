import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDriverPenalties, useDriverPenaltySummaries, DriverPenalty } from "@/hooks/usePenalties";
import { AlertTriangle, Check, X, Eye, Zap, MapPin, DollarSign, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const severityColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  applied: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  appealed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  dismissed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  paid: "bg-green-500/10 text-green-500 border-green-500/20",
};

export function DriverPenaltiesTab() {
  const { penalties, isLoading, updatePenaltyStatus } = useDriverPenalties();
  const { summaries, isLoading: summariesLoading } = useDriverPenaltySummaries();
  const [selectedPenalty, setSelectedPenalty] = useState<DriverPenalty | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const handleReview = () => {
    if (!selectedPenalty || !newStatus) return;
    updatePenaltyStatus.mutate({
      id: selectedPenalty.id,
      status: newStatus,
      review_notes: reviewNotes,
    });
    setSelectedPenalty(null);
    setReviewNotes("");
    setNewStatus("");
  };

  const getViolationIcon = (type: string) => {
    if (type === 'overspeed') return Zap;
    return MapPin;
  };

  const getViolationLabel = (type: string) => {
    switch (type) {
      case 'overspeed': return 'Overspeeding';
      case 'geofence_exit': return 'Geofence Exit';
      case 'geofence_entry_unauthorized': return 'Unauthorized Entry';
      default: return type;
    }
  };

  if (isLoading || summariesLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="penalties">
        <TabsList>
          <TabsTrigger value="penalties">All Penalties</TabsTrigger>
          <TabsTrigger value="summaries">Driver Summaries</TabsTrigger>
        </TabsList>

        <TabsContent value="penalties" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Driver Penalties
              </CardTitle>
              <CardDescription>
                View and manage all driver violations and penalties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Violation</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {penalties?.map((penalty) => {
                    const Icon = getViolationIcon(penalty.violation_type);
                    return (
                      <TableRow key={penalty.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {penalty.driver?.first_name?.[0]}{penalty.driver?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {penalty.driver?.first_name} {penalty.driver?.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div>{getViolationLabel(penalty.violation_type)}</div>
                              {penalty.speed_kmh && penalty.speed_limit_kmh && (
                                <div className="text-xs text-muted-foreground">
                                  {penalty.speed_kmh} km/h (limit: {penalty.speed_limit_kmh})
                                </div>
                              )}
                              {penalty.geofence_name && (
                                <div className="text-xs text-muted-foreground">
                                  {penalty.geofence_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={severityColors[penalty.severity]}>
                            {penalty.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{penalty.penalty_points}</TableCell>
                        <TableCell>${penalty.monetary_fine}</TableCell>
                        <TableCell>
                          {format(new Date(penalty.violation_time), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[penalty.status]}>
                            {penalty.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedPenalty(penalty);
                              setNewStatus(penalty.status);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!penalties || penalties.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No penalties recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summaries" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-500" />
                Driver Penalty Summaries
              </CardTitle>
              <CardDescription>
                Overview of each driver's accumulated penalties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Total Points</TableHead>
                    <TableHead>Total Fines</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Overspeed</TableHead>
                    <TableHead>Geofence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Violation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries?.map((summary) => (
                    <TableRow key={summary.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={summary.driver?.avatar_url || undefined} />
                            <AvatarFallback>
                              {summary.driver?.first_name?.[0]}{summary.driver?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {summary.driver?.first_name} {summary.driver?.last_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Award className="h-4 w-4 text-orange-500" />
                          <span className="font-bold">{summary.total_penalty_points}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="font-bold">${summary.total_fines}</span>
                        </div>
                      </TableCell>
                      <TableCell>{summary.total_violations}</TableCell>
                      <TableCell>{summary.overspeed_count}</TableCell>
                      <TableCell>{summary.geofence_count}</TableCell>
                      <TableCell>
                        {summary.is_suspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {summary.last_violation_at
                          ? format(new Date(summary.last_violation_at), "MMM d, HH:mm")
                          : "-"
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!summaries || summaries.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No penalty summaries found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedPenalty} onOpenChange={() => setSelectedPenalty(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Penalty</DialogTitle>
            <DialogDescription>
              Update the status and add review notes
            </DialogDescription>
          </DialogHeader>
          {selectedPenalty && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Driver</Label>
                  <div className="font-medium">
                    {selectedPenalty.driver?.first_name} {selectedPenalty.driver?.last_name}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vehicle</Label>
                  <div className="font-medium">
                    {selectedPenalty.vehicle?.plate_number || "N/A"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Violation</Label>
                  <div className="font-medium">
                    {getViolationLabel(selectedPenalty.violation_type)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <div className="font-medium">
                    {format(new Date(selectedPenalty.violation_time), "MMM d, yyyy HH:mm")}
                  </div>
                </div>
                {selectedPenalty.speed_kmh && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Speed</Label>
                      <div className="font-medium">{selectedPenalty.speed_kmh} km/h</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Speed Limit</Label>
                      <div className="font-medium">{selectedPenalty.speed_limit_kmh} km/h</div>
                    </div>
                  </>
                )}
                {selectedPenalty.geofence_name && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Geofence</Label>
                    <div className="font-medium">{selectedPenalty.geofence_name}</div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Penalty Points</Label>
                  <div className="font-medium">{selectedPenalty.penalty_points}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fine</Label>
                  <div className="font-medium">${selectedPenalty.monetary_fine}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="appealed">Appealed</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Review Notes</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this review..."
                  rows={3}
                />
              </div>

              {selectedPenalty.appeal_reason && (
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Label className="text-xs text-purple-500">Appeal Reason</Label>
                  <p className="text-sm mt-1">{selectedPenalty.appeal_reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPenalty(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setNewStatus("dismissed");
                handleReview();
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
            <Button onClick={handleReview} disabled={updatePenaltyStatus.isPending}>
              <Check className="h-4 w-4 mr-2" />
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

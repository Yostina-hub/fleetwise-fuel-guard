import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDriverScores } from "@/hooks/useDriverScores";
import { useDrivers } from "@/hooks/useDrivers";
import { useVehicles } from "@/hooks/useVehicles";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  Calculator,
  User,
  Award,
  AlertCircle,
  Search,
  Download,
  Filter,
  Trophy,
  Target,
  Loader2,
  History
} from "lucide-react";
import { format } from "date-fns";

const getRatingColor = (rating: string) => {
  switch (rating) {
    case "excellent": return "text-success bg-success/10 border-success/20";
    case "good": return "text-primary bg-primary/10 border-primary/20";
    case "fair": return "text-warning bg-warning/10 border-warning/20";
    case "poor": return "text-orange-600 bg-orange-50 border-orange-200";
    case "critical": return "text-destructive bg-destructive/10 border-destructive/20";
    default: return "text-muted-foreground bg-muted border-border";
  }
};

const getRatingIcon = (rating: string) => {
  switch (rating) {
    case "excellent": return <Award className="h-4 w-4" />;
    case "good": return <CheckCircle className="h-4 w-4" />;
    case "fair": return <Minus className="h-4 w-4" />;
    case "poor": return <AlertCircle className="h-4 w-4" />;
    case "critical": return <AlertTriangle className="h-4 w-4" />;
    default: return <User className="h-4 w-4" />;
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "improving": return <TrendingUp className="h-4 w-4 text-success" />;
    case "declining": return <TrendingDown className="h-4 w-4 text-destructive" />;
    default: return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
};

export const DriverScoringTab = () => {
  const { driverScores, scoreHistory, isLoading, calculateScore } = useDriverScores();
  const { drivers } = useDrivers(); // Needed for calculate dialog
  const { vehicles } = useVehicles();
  const [isCalculateDialogOpen, setIsCalculateDialogOpen] = useState(false);
  const [selectedDriverScore, setSelectedDriverScore] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");

  const [calcForm, setCalcForm] = useState({
    driverId: "",
    vehicleId: "",
    startDate: "",
    endDate: "",
  });

  // Get top 3 performers for leaderboard
  const topPerformers = useMemo(() => {
    if (!driverScores) return [];
    return [...driverScores]
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 3);
  }, [driverScores]);

  const filteredScores = useMemo(() => {
    if (!driverScores) return [];
    return driverScores.filter((score) => {
      const driverName = score.driver 
        ? `${score.driver.first_name} ${score.driver.last_name}`.toLowerCase() 
        : "";
      const matchesSearch = searchQuery === "" || driverName.includes(searchQuery.toLowerCase());
      const matchesRating = ratingFilter === "all" || score.safety_rating === ratingFilter;
      return matchesSearch && matchesRating;
    });
  }, [driverScores, searchQuery, ratingFilter]);

  const handleCalculateScore = () => {
    calculateScore.mutate(calcForm);
    setIsCalculateDialogOpen(false);
    setCalcForm({ driverId: "", vehicleId: "", startDate: "", endDate: "" });
  };

  const getDriverName = (score: any) => {
    return score.driver 
      ? `${score.driver.first_name} ${score.driver.last_name}` 
      : "Unknown Driver";
  };

  const getDriverInitials = (score: any) => {
    return score.driver 
      ? `${score.driver.first_name.charAt(0)}${score.driver.last_name.charAt(0)}` 
      : "??";
  };

  const getVehiclePlate = (score: any) => {
    return score.vehicle?.plate_number || "Unknown Vehicle";
  };

  const handleExportScores = () => {
    if (!driverScores) return;
    const csv = [
      ["Rank", "Driver", "Vehicle", "Overall Score", "Safety Rating", "Speed Violations", "Harsh Braking", "Harsh Acceleration"].join(","),
      ...driverScores.map((score, idx) => [
        idx + 1,
        getDriverName(score.driver_id),
        getVehiclePlate(score.vehicle_id),
        score.overall_score,
        score.safety_rating,
        score.speed_violations,
        score.harsh_braking_events,
        score.harsh_acceleration_events
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `driver_scores_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading driver scores...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search drivers..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportScores}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={isCalculateDialogOpen} onOpenChange={setIsCalculateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/80">
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Score
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Calculate Driver Score</DialogTitle>
                <DialogDescription>
                  Select driver, vehicle, and time period to calculate safety score
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="driver">Driver</Label>
                  <Select
                    value={calcForm.driverId}
                    onValueChange={(value) => setCalcForm({ ...calcForm, driverId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.first_name} {driver.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle</Label>
                  <Select
                    value={calcForm.vehicleId}
                    onValueChange={(value) => setCalcForm({ ...calcForm, vehicleId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={calcForm.startDate}
                    onChange={(e) => setCalcForm({ ...calcForm, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={calcForm.endDate}
                    onChange={(e) => setCalcForm({ ...calcForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCalculateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCalculateScore}
                  disabled={!calcForm.driverId || !calcForm.vehicleId || !calcForm.startDate || !calcForm.endDate}
                >
                  {calculateScore.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    "Calculate"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Top Performers Leaderboard */}
      {topPerformers.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Top Performers
            </CardTitle>
            <CardDescription>Leading drivers by safety score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPerformers.map((score, index) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div 
                    key={score.id} 
                    className={`p-4 rounded-lg border ${
                      index === 0 ? 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-900/10' :
                      index === 1 ? 'bg-gray-50/50 border-gray-200 dark:bg-gray-800/20' :
                      'bg-orange-50/50 border-orange-200 dark:bg-orange-900/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{medals[index]}</span>
                      <Avatar>
                        <AvatarImage src={score.driver?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getDriverInitials(score)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{getDriverName(score)}</div>
                        <div className="text-xs text-muted-foreground">{getVehiclePlate(score)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{score.overall_score}</div>
                        <Badge className={getRatingColor(score.safety_rating)}>
                          {score.safety_rating}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-success" />
              Excellent Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {driverScores?.filter(s => s.safety_rating === 'excellent').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              At Risk Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {driverScores?.filter(s => s.safety_rating === 'poor' || s.safety_rating === 'critical').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {driverScores && driverScores.length > 0
                ? Math.round(driverScores.reduce((acc, s) => acc + s.overall_score, 0) / driverScores.length)
                : 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Total Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {driverScores?.reduce((acc, s) => acc + s.speed_violations, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Rankings and History */}
      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rankings" className="gap-2">
            <Trophy className="w-4 h-4" />
            Rankings
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Score History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rankings">
          <Card>
            <CardHeader>
              <CardTitle>Driver Rankings</CardTitle>
              <CardDescription>
                {filteredScores.length} drivers {searchQuery || ratingFilter !== "all" ? "(filtered)" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Rank</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Overall Score</TableHead>
                    <TableHead>Safety Rating</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScores.map((score, index) => {
                    return (
                      <TableRow key={score.id}>
                        <TableCell className="font-medium">
                          {index < 3 ? (
                            <span className="text-lg">{["🥇", "🥈", "🥉"][index]}</span>
                          ) : (
                            `#${index + 1}`
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={score.driver?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getDriverInitials(score)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{getDriverName(score)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getVehiclePlate(score)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={score.overall_score} className="w-20" />
                            <span className="text-sm font-medium">{score.overall_score}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRatingColor(score.safety_rating)}>
                            {getRatingIcon(score.safety_rating)}
                            <span className="ml-1 capitalize">{score.safety_rating}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{getTrendIcon(score.trend)}</TableCell>
                        <TableCell>
                          <span className="text-destructive font-medium">
                            {score.speed_violations}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDriverScore(score)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredScores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No driver scores found</h3>
                        <p className="text-muted-foreground text-sm">
                          {searchQuery || ratingFilter !== "all" 
                            ? "Try adjusting your filters" 
                            : "Click 'Calculate Score' to generate driver safety scores"}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Score History</CardTitle>
              <CardDescription>Historical safety score calculations</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Calculated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoreHistory?.map((score) => (
                    <TableRow key={score.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getDriverName(score.driver_id).split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          {getDriverName(score.driver_id)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(score.score_period_start), "MMM d")} - {format(new Date(score.score_period_end), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{score.overall_score}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRatingColor(score.safety_rating)}>
                          {score.safety_rating}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-destructive">{score.speed_violations}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(score.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!scoreHistory || scoreHistory.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No score history available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={!!selectedDriverScore} onOpenChange={() => setSelectedDriverScore(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Driver Score Details</DialogTitle>
            <DialogDescription>
              {selectedDriverScore && (
                <>
                  {getDriverName(selectedDriverScore.driver_id)} - {getVehiclePlate(selectedDriverScore.vehicle_id)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDriverScore && (
            <div className="space-y-6 py-4">
              {/* Overall Score */}
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">
                  {selectedDriverScore.overall_score}
                </div>
                <Badge className={`${getRatingColor(selectedDriverScore.safety_rating)} text-lg px-4 py-1`}>
                  {getRatingIcon(selectedDriverScore.safety_rating)}
                  <span className="ml-2">{selectedDriverScore.safety_rating}</span>
                </Badge>
              </div>

              {/* Individual Scores */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Speeding</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={selectedDriverScore.speeding_score} className="mb-2" />
                    <p className="text-2xl font-bold">{selectedDriverScore.speeding_score}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDriverScore.speed_violations} violations
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Braking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={selectedDriverScore.braking_score} className="mb-2" />
                    <p className="text-2xl font-bold">{selectedDriverScore.braking_score}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDriverScore.harsh_braking_events} harsh events
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Acceleration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={selectedDriverScore.acceleration_score} className="mb-2" />
                    <p className="text-2xl font-bold">{selectedDriverScore.acceleration_score}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDriverScore.harsh_acceleration_events} harsh events
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Idle Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={selectedDriverScore.idle_score} className="mb-2" />
                    <p className="text-2xl font-bold">{selectedDriverScore.idle_score}</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(selectedDriverScore.total_idle_time / 60)} min idle
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Factors */}
              {selectedDriverScore.risk_factors?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Risk Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedDriverScore.risk_factors.map((factor: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {selectedDriverScore.recommendations?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedDriverScore.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Distance</p>
                  <p className="font-medium">{selectedDriverScore.total_distance.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Drive Time</p>
                  <p className="font-medium">{Math.round(selectedDriverScore.total_drive_time / 3600)} hours</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Period</p>
                  <p className="font-medium">
                    {new Date(selectedDriverScore.score_period_start).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

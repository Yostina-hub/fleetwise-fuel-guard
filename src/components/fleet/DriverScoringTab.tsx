import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  AlertCircle
} from "lucide-react";

const getRatingColor = (rating: string) => {
  switch (rating) {
    case "excellent": return "text-green-600 bg-green-50 border-green-200";
    case "good": return "text-blue-600 bg-blue-50 border-blue-200";
    case "fair": return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "poor": return "text-orange-600 bg-orange-50 border-orange-200";
    case "critical": return "text-red-600 bg-red-50 border-red-200";
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
    case "improving": return <TrendingUp className="h-4 w-4 text-green-600" />;
    case "declining": return <TrendingDown className="h-4 w-4 text-red-600" />;
    default: return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
};

export const DriverScoringTab = () => {
  const { driverScores, isLoading, calculateScore } = useDriverScores();
  const { drivers } = useDrivers();
  const { vehicles } = useVehicles();
  const [isCalculateDialogOpen, setIsCalculateDialogOpen] = useState(false);
  const [selectedDriverScore, setSelectedDriverScore] = useState<any>(null);

  const [calcForm, setCalcForm] = useState({
    driverId: "",
    vehicleId: "",
    startDate: "",
    endDate: "",
  });

  const handleCalculateScore = () => {
    calculateScore.mutate(calcForm);
    setIsCalculateDialogOpen(false);
    setCalcForm({ driverId: "", vehicleId: "", startDate: "", endDate: "" });
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers?.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : "Unknown Driver";
  };

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown Vehicle";
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading driver scores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Driver Behavior Scoring</h2>
          <p className="text-muted-foreground">
            Safety scores and risk analysis for all drivers
          </p>
        </div>
        <Dialog open={isCalculateDialogOpen} onOpenChange={setIsCalculateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
              <Button onClick={handleCalculateScore}>Calculate</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Excellent Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {driverScores?.filter(s => s.safety_rating === 'excellent').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              At Risk Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {driverScores?.filter(s => s.safety_rating === 'poor' || s.safety_rating === 'critical').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {driverScores && driverScores.length > 0
                ? Math.round(driverScores.reduce((acc, s) => acc + s.overall_score, 0) / driverScores.length)
                : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {driverScores?.reduce((acc, s) => acc + s.speed_violations, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scores Table */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Rankings</CardTitle>
          <CardDescription>Latest safety scores for all drivers</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
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
              {driverScores?.map((score, index) => (
                <TableRow key={score.id}>
                  <TableCell className="font-medium">#{index + 1}</TableCell>
                  <TableCell>{getDriverName(score.driver_id)}</TableCell>
                  <TableCell>{getVehiclePlate(score.vehicle_id)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={score.overall_score} className="w-20" />
                      <span className="text-sm font-medium">{score.overall_score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRatingColor(score.safety_rating)}>
                      {getRatingIcon(score.safety_rating)}
                      <span className="ml-1">{score.safety_rating}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>{getTrendIcon(score.trend)}</TableCell>
                  <TableCell>
                    <span className="text-red-600 font-medium">
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
              ))}
              {driverScores?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No driver scores calculated yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

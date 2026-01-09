import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Heart, 
  Moon, 
  AlertTriangle, 
  CheckCircle2, 
  Wine,
  Loader2,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useDriverWellnessChecks, WellnessCheckInput } from "@/hooks/useDriverWellnessChecks";
import { cn } from "@/lib/utils";

interface WellnessCheckFormProps {
  driverId: string;
  vehicleId?: string | null;
  onComplete?: (isFitToDrive: boolean) => void;
}

const fatigueLevels = [
  { level: 1, label: "Alert & Rested", emoji: "😊", color: "text-green-500" },
  { level: 2, label: "Slightly Tired", emoji: "🙂", color: "text-green-400" },
  { level: 3, label: "Moderately Tired", emoji: "😐", color: "text-yellow-500" },
  { level: 4, label: "Very Tired", emoji: "😔", color: "text-orange-500" },
  { level: 5, label: "Exhausted", emoji: "😫", color: "text-red-500" },
];

export function WellnessCheckForm({ driverId, vehicleId, onComplete }: WellnessCheckFormProps) {
  const { submitCheck, todayCheck } = useDriverWellnessChecks(driverId);
  
  const [fatigueLevel, setFatigueLevel] = useState(1);
  const [hoursSlept, setHoursSlept] = useState<string>("");
  const [sobrietyConfirmed, setSobrietyConfirmed] = useState(false);
  const [feelingWell, setFeelingWell] = useState(true);
  const [notes, setNotes] = useState("");

  // If already checked today, show status
  if (todayCheck) {
    return (
      <Card className={cn(
        "border-2",
        todayCheck.is_fit_to_drive ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
      )}>
        <CardHeader className="text-center pb-2">
          {todayCheck.is_fit_to_drive ? (
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-2" />
          ) : (
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-2" />
          )}
          <CardTitle className={todayCheck.is_fit_to_drive ? "text-green-600" : "text-red-600"}>
            {todayCheck.is_fit_to_drive ? "Cleared to Drive" : "Not Cleared"}
          </CardTitle>
          <CardDescription>
            Wellness check completed at {new Date(todayCheck.check_time).toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        {!todayCheck.is_fit_to_drive && todayCheck.rejection_reason && (
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Reason: {todayCheck.rejection_reason}
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  const handleSubmit = async () => {
    const input: WellnessCheckInput = {
      driver_id: driverId,
      vehicle_id: vehicleId,
      fatigue_level: fatigueLevel,
      hours_slept: hoursSlept ? parseFloat(hoursSlept) : null,
      sobriety_confirmed: sobrietyConfirmed,
      feeling_well: feelingWell,
      notes: notes || null,
    };

    // Try to get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          input.lat = position.coords.latitude;
          input.lng = position.coords.longitude;
          const result = await submitCheck.mutateAsync(input);
          onComplete?.(result.is_fit_to_drive);
        },
        async () => {
          // Location denied, submit without
          const result = await submitCheck.mutateAsync(input);
          onComplete?.(result.is_fit_to_drive);
        }
      );
    } else {
      const result = await submitCheck.mutateAsync(input);
      onComplete?.(result.is_fit_to_drive);
    }
  };

  const currentFatigue = fatigueLevels[fatigueLevel - 1];
  const sleepHours = hoursSlept ? parseFloat(hoursSlept) : null;
  const hasIssues = fatigueLevel > 3 || !sobrietyConfirmed || !feelingWell || (sleepHours !== null && sleepHours < 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Pre-Trip Wellness Check
        </CardTitle>
        <CardDescription>
          Complete this assessment before starting your trip
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fatigue Level */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            How do you feel right now?
          </Label>
          <div className="text-center py-4">
            <motion.span 
              key={fatigueLevel}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn("text-5xl block mb-2", currentFatigue.color)}
            >
              {currentFatigue.emoji}
            </motion.span>
            <span className={cn("font-medium", currentFatigue.color)}>
              {currentFatigue.label}
            </span>
          </div>
          <Slider
            value={[fatigueLevel]}
            onValueChange={([val]) => setFatigueLevel(val)}
            min={1}
            max={5}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Alert</span>
            <span>Exhausted</span>
          </div>
        </div>

        {/* Hours of Sleep */}
        <div className="space-y-2">
          <Label htmlFor="sleep">Hours of sleep in last 24 hours</Label>
          <Input
            id="sleep"
            type="number"
            placeholder="e.g. 7.5"
            value={hoursSlept}
            onChange={(e) => setHoursSlept(e.target.value)}
            min={0}
            max={24}
            step={0.5}
          />
          {sleepHours !== null && sleepHours < 6 && (
            <p className="text-xs text-orange-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Less than 6 hours may affect driving ability
            </p>
          )}
        </div>

        {/* Sobriety Confirmation */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <Wine className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="sober" className="font-medium cursor-pointer">
                Sobriety Confirmation
              </Label>
              <p className="text-xs text-muted-foreground">
                I confirm I am not under the influence of alcohol or drugs
              </p>
            </div>
          </div>
          <Switch
            id="sober"
            checked={sobrietyConfirmed}
            onCheckedChange={setSobrietyConfirmed}
          />
        </div>

        {/* Feeling Well */}
        <div className="space-y-2">
          <Label>Are you feeling well enough to drive safely?</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={feelingWell ? "default" : "outline"}
              className={cn(
                "h-auto py-4",
                feelingWell && "bg-green-600 hover:bg-green-700"
              )}
              onClick={() => setFeelingWell(true)}
            >
              <ThumbsUp className="h-5 w-5 mr-2" />
              Yes, I'm Well
            </Button>
            <Button
              type="button"
              variant={!feelingWell ? "destructive" : "outline"}
              className="h-auto py-4"
              onClick={() => setFeelingWell(false)}
            >
              <ThumbsDown className="h-5 w-5 mr-2" />
              Not Feeling Well
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any concerns or symptoms to report..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Warning if issues detected */}
        {hasIssues && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-600">Fitness Concerns Detected</p>
                <p className="text-sm text-muted-foreground">
                  Based on your responses, you may not be fit to drive. 
                  Your supervisor will be notified for review.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitCheck.isPending || !sobrietyConfirmed}
          className="w-full h-12 text-lg"
          variant={hasIssues ? "destructive" : "default"}
        >
          {submitCheck.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Submit Wellness Check
            </>
          )}
        </Button>

        {!sobrietyConfirmed && (
          <p className="text-xs text-center text-muted-foreground">
            You must confirm sobriety to submit this check
          </p>
        )}
      </CardContent>
    </Card>
  );
}

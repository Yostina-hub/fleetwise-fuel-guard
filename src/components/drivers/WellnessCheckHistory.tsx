import { format } from "date-fns";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Moon, 
  Wine,
  Heart,
  AlertTriangle,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDriverWellnessChecks, WellnessCheck } from "@/hooks/useDriverWellnessChecks";
import { cn } from "@/lib/utils";

interface WellnessCheckHistoryProps {
  driverId?: string;
  limit?: number;
  showDriver?: boolean;
}

const fatigueLevelEmoji: Record<number, string> = {
  1: "😊",
  2: "🙂",
  3: "😐",
  4: "😔",
  5: "😫",
};

function WellnessCheckCard({ check, showDriver }: { check: WellnessCheck; showDriver?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-lg border",
        check.is_fit_to_drive 
          ? "bg-green-500/5 border-green-500/20" 
          : "bg-red-500/5 border-red-500/20"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {showDriver && check.driver && (
            <Avatar className="h-10 w-10">
              <AvatarImage src={check.driver.avatar_url || undefined} />
              <AvatarFallback>
                {check.driver.first_name[0]}{check.driver.last_name[0]}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            {showDriver && check.driver && (
              <p className="font-medium">
                {check.driver.first_name} {check.driver.last_name}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(check.check_time), "PPp")}
            </div>
          </div>
        </div>
        
        <Badge variant={check.is_fit_to_drive ? "default" : "destructive"}>
          {check.is_fit_to_drive ? (
            <><CheckCircle2 className="h-3 w-3 mr-1" /> Cleared</>
          ) : (
            <><XCircle className="h-3 w-3 mr-1" /> Not Cleared</>
          )}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">{fatigueLevelEmoji[check.fatigue_level]}</span>
          <span className="text-muted-foreground">Level {check.fatigue_level}</span>
        </div>
        
        {check.hours_slept !== null && (
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <span>{check.hours_slept}h sleep</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Wine className={cn(
            "h-4 w-4",
            check.sobriety_confirmed ? "text-green-500" : "text-red-500"
          )} />
          <span>{check.sobriety_confirmed ? "Sober" : "Not confirmed"}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Heart className={cn(
            "h-4 w-4",
            check.feeling_well ? "text-green-500" : "text-red-500"
          )} />
          <span>{check.feeling_well ? "Well" : "Unwell"}</span>
        </div>
      </div>

      {check.rejection_reason && (
        <div className="mt-3 p-2 rounded bg-red-500/10 text-sm">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {check.rejection_reason}
          </div>
        </div>
      )}

      {check.notes && (
        <p className="mt-3 text-sm text-muted-foreground italic">
          "{check.notes}"
        </p>
      )}

      {check.reviewed_at && (
        <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            Reviewed {format(new Date(check.reviewed_at), "PPp")}
            {check.review_notes && `: ${check.review_notes}`}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function WellnessCheckHistory({ driverId, limit = 10, showDriver = false }: WellnessCheckHistoryProps) {
  const { wellnessChecks, isLoading } = useDriverWellnessChecks(driverId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Wellness Check History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const checks = wellnessChecks?.slice(0, limit) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Wellness Check History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {checks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No wellness checks recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {checks.map((check, index) => (
                <WellnessCheckCard 
                  key={check.id} 
                  check={check} 
                  showDriver={showDriver}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { differenceInMinutes, format, isPast } from "date-fns";

interface SLAIndicatorProps {
  slaDeadline?: string | null;
  actualTime?: string | null;
  status: string;
}

const SLAIndicator = ({ slaDeadline, actualTime, status }: SLAIndicatorProps) => {
  if (!slaDeadline) return null;

  const deadline = new Date(slaDeadline);
  const now = new Date();
  const completed = status === 'completed';
  
  // If completed, check if it was on time
  if (completed && actualTime) {
    const completedAt = new Date(actualTime);
    const wasOnTime = completedAt <= deadline;
    
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            className={`gap-1 ${
              wasOnTime 
                ? 'bg-success/10 text-success border-success/20' 
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}
          >
            {wasOnTime ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            {wasOnTime ? 'On Time' : 'Late'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {wasOnTime 
              ? `Completed ${Math.abs(differenceInMinutes(completedAt, deadline))} min early`
              : `Completed ${differenceInMinutes(completedAt, deadline)} min late`
            }
          </p>
          <p className="text-xs text-muted-foreground">
            SLA: {format(deadline, 'MMM d, HH:mm')}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // In progress - show time remaining/overdue
  const isOverdue = isPast(deadline);
  const minutesDiff = Math.abs(differenceInMinutes(now, deadline));
  const hours = Math.floor(minutesDiff / 60);
  const mins = minutesDiff % 60;
  
  const timeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  if (isOverdue) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {timeLabel} overdue
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>SLA breached: {format(deadline, 'MMM d, HH:mm')}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Time remaining
  const urgency = minutesDiff <= 30 ? 'critical' : minutesDiff <= 60 ? 'warning' : 'ok';

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge 
          className={`gap-1 ${
            urgency === 'critical' 
              ? 'bg-destructive/10 text-destructive border-destructive/20' 
              : urgency === 'warning'
              ? 'bg-warning/10 text-warning border-warning/20'
              : 'bg-primary/10 text-primary border-primary/20'
          }`}
        >
          <Clock className="w-3 h-3" />
          {timeLabel} left
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>SLA deadline: {format(deadline, 'MMM d, HH:mm')}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default SLAIndicator;

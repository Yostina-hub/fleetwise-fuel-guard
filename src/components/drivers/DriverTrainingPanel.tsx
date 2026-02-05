import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDriverTraining } from "@/hooks/useDriverTraining";
import { 
  BookOpen, 
  Play, 
  CheckCircle, 
  Clock, 
  Award,
  AlertCircle,
  Video,
  FileText,
  HelpCircle,
  Gamepad2,
  Loader2,
  Lock,
  RefreshCw
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface DriverTrainingPanelProps {
  driverId: string;
}

const getContentIcon = (type: string) => {
  switch (type) {
    case 'video': return <Video className="w-4 h-4" />;
    case 'document': return <FileText className="w-4 h-4" />;
    case 'quiz': return <HelpCircle className="w-4 h-4" />;
    case 'interactive': return <Gamepad2 className="w-4 h-4" />;
    default: return <BookOpen className="w-4 h-4" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed': return <Badge className="bg-green-500/20 text-green-500">Completed</Badge>;
    case 'in_progress': return <Badge className="bg-blue-500/20 text-blue-500">In Progress</Badge>;
    case 'failed': return <Badge className="bg-red-500/20 text-red-500">Failed</Badge>;
    case 'expired': return <Badge className="bg-orange-500/20 text-orange-500">Expired</Badge>;
    default: return <Badge variant="outline">Not Started</Badge>;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'safety': return 'border-l-green-500';
    case 'compliance': return 'border-l-red-500';
    case 'efficiency': return 'border-l-blue-500';
    case 'customer_service': return 'border-l-purple-500';
    default: return 'border-l-primary';
  }
};

export const DriverTrainingPanel = ({ driverId }: DriverTrainingPanelProps) => {
  const { 
    courses, 
    driverProgress, 
    stats, 
    isLoading,
    startCourse,
    completeCourse
  } = useDriverTraining(driverId);

  const [selectedTab, setSelectedTab] = useState("all");

  if (isLoading) {
    return (
      <Card className="glass-strong">
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const progressMap = new Map(driverProgress.map(p => [p.course_id, p]));

  const filteredCourses = courses.filter(course => {
    const progress = progressMap.get(course.id);
    if (selectedTab === "all") return true;
    if (selectedTab === "required") return course.is_required;
    if (selectedTab === "in_progress") return progress?.status === "in_progress";
    if (selectedTab === "completed") return progress?.status === "completed";
    return true;
  });

  const requiredCourses = courses.filter(c => c.is_required);
  const completedRequired = requiredCourses.filter(c => 
    progressMap.get(c.id)?.status === "completed"
  ).length;

  return (
    <div className="space-y-6">
      {/* Training Overview */}
      <Card className="glass-strong">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <CardTitle>Training & Certifications</CardTitle>
          </div>
          <CardDescription>Complete training courses to improve skills and earn XP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-primary">{stats.completedCourses}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-blue-500">{stats.inProgressCourses}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-orange-500">{stats.requiredCourses - completedRequired}</div>
              <div className="text-sm text-muted-foreground">Required Pending</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-green-500">{stats.overallProgress}%</div>
              <div className="text-sm text-muted-foreground">Overall Progress</div>
            </div>
          </div>

          {/* Required Courses Progress */}
          {stats.requiredCourses > 0 && (
            <div className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="font-medium">Required Training Progress</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {completedRequired} / {stats.requiredCourses} completed
                </span>
              </div>
              <Progress 
                value={stats.requiredProgress} 
                className="h-2"
              />
              {stats.requiredProgress < 100 && (
                <p className="text-xs text-red-500 mt-2">
                  Complete all required courses to maintain compliance
                </p>
              )}
            </div>
          )}

          {/* Course Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Courses</TabsTrigger>
              <TabsTrigger value="required">Required</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab}>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>No courses in this category</p>
                    </div>
                  ) : (
                    filteredCourses.map((course) => {
                      const progress = progressMap.get(course.id);
                      const isCompleted = progress?.status === "completed";
                      const isInProgress = progress?.status === "in_progress";

                      return (
                        <Card 
                          key={course.id}
                          className={cn(
                            "border-l-4 transition-all hover:shadow-md",
                            getCategoryColor(course.category),
                            isCompleted && "bg-green-500/5"
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getContentIcon(course.content_type)}
                                  <h4 className="font-semibold">{course.title}</h4>
                                  {course.is_required && (
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {course.description}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {course.duration_minutes} min
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Award className="w-3 h-3" />
                                    +{course.xp_reward} XP
                                  </span>
                                  <span className="capitalize">{course.category.replace('_', ' ')}</span>
                                </div>

                                {isInProgress && progress && (
                                  <div className="mt-3">
                                    <div className="flex justify-between text-xs mb-1">
                                      <span>Progress</span>
                                      <span>{progress.progress_percent}%</span>
                                    </div>
                                    <Progress value={progress.progress_percent} className="h-1.5" />
                                  </div>
                                )}

                                {isCompleted && progress && (
                                  <div className="mt-2 flex items-center gap-2 text-sm text-green-500">
                                    <CheckCircle className="w-4 h-4" />
                                    Completed on {format(new Date(progress.completed_at!), "MMM d, yyyy")}
                                    {progress.score && <span>• Score: {progress.score}%</span>}
                                  </div>
                                )}

                                {progress?.status === "failed" && (
                                  <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                                    <AlertCircle className="w-4 h-4" />
                                    Failed with score {progress.score}% (Required: {course.pass_score}%)
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(progress?.status || 'not_started')}
                                
                                {!isCompleted && (
                                  <Button
                                    size="sm"
                                    variant={isInProgress ? "default" : "outline"}
                                    onClick={() => {
                                      if (!isInProgress) {
                                        startCourse.mutate({ driverId, courseId: course.id });
                                      }
                                    }}
                                    disabled={startCourse.isPending}
                                  >
                                    {isInProgress ? (
                                      <>
                                        <Play className="w-3 h-3 mr-1" />
                                        Continue
                                      </>
                                    ) : progress?.status === "failed" ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Retry
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-3 h-3 mr-1" />
                                        Start
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

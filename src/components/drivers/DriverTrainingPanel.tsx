import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useDriverTraining } from "@/hooks/useDriverTraining";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import {
  BookOpen, Play, CheckCircle, Clock, Award, AlertCircle, Video, FileText,
  HelpCircle, Gamepad2, Loader2, RefreshCw, Plus, GraduationCap, Paperclip,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CourseMaterialsPanel } from "./CourseMaterialsPanel";

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
  const { organizationId } = useOrganization();
  const { courses, driverProgress, stats, isLoading, startCourse, completeCourse } = useDriverTraining(driverId);
  const [selectedTab, setSelectedTab] = useState("all");
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showComplete, setShowComplete] = useState<string | null>(null);
  const [showMaterials, setShowMaterials] = useState<{ id: string; title: string } | null>(null);
  const [score, setScore] = useState([80]);
  const [saving, setSaving] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "", description: "", category: "safety", content_type: "video",
    duration_minutes: "30", xp_reward: "50", is_required: false, pass_score: "80", expires_months: "",
  });

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
  const completedRequired = requiredCourses.filter(c => progressMap.get(c.id)?.status === "completed").length;

  const handleCreateCourse = async () => {
    if (!organizationId || !courseForm.title) return;
    setSaving(true);
    const { error } = await (supabase as any).from("driver_training_courses").insert({
      organization_id: organizationId,
      title: courseForm.title,
      description: courseForm.description || null,
      category: courseForm.category,
      content_type: courseForm.content_type,
      duration_minutes: parseInt(courseForm.duration_minutes) || 0,
      xp_reward: parseInt(courseForm.xp_reward) || 50,
      is_required: courseForm.is_required,
      pass_score: parseInt(courseForm.pass_score) || 80,
      expires_months: courseForm.expires_months ? parseInt(courseForm.expires_months) : null,
    });
    setSaving(false);
    if (error) { toast.error("Failed to create course"); return; }
    toast.success("Training course created");
    setShowAddCourse(false);
    setCourseForm({ title: "", description: "", category: "safety", content_type: "video", duration_minutes: "30", xp_reward: "50", is_required: false, pass_score: "80", expires_months: "" });
  };

  const handleComplete = (courseId: string) => {
    completeCourse.mutate({ driverId, courseId, score: score[0] });
    setShowComplete(null);
  };

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <CardTitle>Training & Certifications</CardTitle>
            </div>
            <Button className="gap-2" onClick={() => setShowAddCourse(true)}>
              <Plus className="w-4 h-4" />Add Course
            </Button>
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

          {stats.requiredCourses > 0 && (
            <div className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="font-medium">Required Training Progress</span>
                </div>
                <span className="text-sm text-muted-foreground">{completedRequired} / {stats.requiredCourses} completed</span>
              </div>
              <Progress value={stats.requiredProgress} className="h-2" />
            </div>
          )}

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
                        <Card key={course.id} className={cn("border-l-4 transition-all hover:shadow-md", getCategoryColor(course.category), isCompleted && "bg-green-500/5")}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getContentIcon(course.content_type)}
                                  <h4 className="font-semibold">{course.title}</h4>
                                  {course.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{course.description}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration_minutes} min</span>
                                  <span className="flex items-center gap-1"><Award className="w-3 h-3" />+{course.xp_reward} XP</span>
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
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowMaterials({ id: course.id, title: course.title })}>
                                  <Paperclip className="w-3 h-3" />Materials
                                </Button>
                                {isInProgress && (
                                  <Button size="sm" onClick={() => { setScore([80]); setShowComplete(course.id); }}>
                                    <GraduationCap className="w-3 h-3 mr-1" />Complete
                                  </Button>
                                )}
                                {!isCompleted && !isInProgress && (
                                  <Button size="sm" variant="outline" onClick={() => startCourse.mutate({ driverId, courseId: course.id })} disabled={startCourse.isPending}>
                                    {progress?.status === "failed" ? <><RefreshCw className="w-3 h-3 mr-1" />Retry</> : <><Play className="w-3 h-3 mr-1" />Start</>}
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

      {/* Add Course Dialog */}
      <Dialog open={showAddCourse} onOpenChange={setShowAddCourse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Training Course</DialogTitle>
            <DialogDescription>Add a new course available to all drivers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Title *</Label>
              <Input value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Defensive Driving" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={courseForm.category} onValueChange={v => setCourseForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="efficiency">Efficiency</SelectItem>
                    <SelectItem value="customer_service">Customer Service</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content Type</Label>
                <Select value={courseForm.content_type} onValueChange={v => setCourseForm(f => ({ ...f, content_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="interactive">Interactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={courseForm.duration_minutes} onChange={e => setCourseForm(f => ({ ...f, duration_minutes: e.target.value }))} />
              </div>
              <div>
                <Label>XP Reward</Label>
                <Input type="number" value={courseForm.xp_reward} onChange={e => setCourseForm(f => ({ ...f, xp_reward: e.target.value }))} />
              </div>
              <div>
                <Label>Pass Score (%)</Label>
                <Input type="number" value={courseForm.pass_score} onChange={e => setCourseForm(f => ({ ...f, pass_score: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expires (months)</Label>
                <Input type="number" value={courseForm.expires_months} onChange={e => setCourseForm(f => ({ ...f, expires_months: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={courseForm.is_required} onCheckedChange={v => setCourseForm(f => ({ ...f, is_required: v }))} />
                <Label>Required Course</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCourse(false)}>Cancel</Button>
            <Button onClick={handleCreateCourse} disabled={saving || !courseForm.title}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? "Creating..." : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Course Dialog */}
      <Dialog open={!!showComplete} onOpenChange={open => !open && setShowComplete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Course</DialogTitle>
            <DialogDescription>Enter the driver's score for this course.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Score</Label>
                <span className="text-2xl font-bold">{score[0]}%</span>
              </div>
              <Slider value={score} onValueChange={setScore} min={0} max={100} step={1} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
            {showComplete && (() => {
              const course = courses.find(c => c.id === showComplete);
              if (!course) return null;
              const passed = score[0] >= course.pass_score;
              return (
                <div className={`p-3 rounded-lg ${passed ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                  <p className="text-sm font-medium">
                    {passed ? `✓ Pass (min ${course.pass_score}%) — +${course.xp_reward} XP` : `✗ Below passing score (${course.pass_score}%)`}
                  </p>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComplete(null)}>Cancel</Button>
            <Button onClick={() => showComplete && handleComplete(showComplete)}>
              Submit Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

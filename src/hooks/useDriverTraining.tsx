import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

export interface TrainingCourse {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category: string;
  content_type: string;
  content_url: string | null;
  duration_minutes: number;
  xp_reward: number;
  is_required: boolean;
  pass_score: number;
  expires_months: number | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgress {
  id: string;
  organization_id: string;
  driver_id: string;
  course_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';
  progress_percent: number;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
  course?: TrainingCourse;
}

export const useDriverTraining = (driverId?: string) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all training courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["training-courses", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("driver_training_courses")
        .select("*")
        .order("is_required", { ascending: false })
        .order("category", { ascending: true });
      if (error) throw error;
      return data as TrainingCourse[];
    },
    enabled: !!organizationId,
  });

  // Fetch training progress for a driver
  const { data: driverProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["training-progress", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await (supabase as any)
        .from("driver_training_progress")
        .select(`
          *,
          course:course_id (*)
        `)
        .eq("driver_id", driverId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as TrainingProgress[];
    },
    enabled: !!driverId,
  });

  // Fetch all progress for org (for reporting)
  const { data: allProgress = [] } = useQuery({
    queryKey: ["all-training-progress", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("driver_training_progress")
        .select(`
          *,
          course:course_id (*),
          driver:driver_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Start a course
  const startCourse = useMutation({
    mutationFn: async ({ driverId, courseId }: { driverId: string; courseId: string }) => {
      if (!organizationId) throw new Error("No organization");
      
      const course = courses.find(c => c.id === courseId);
      let expiresAt = null;
      if (course?.expires_months) {
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + course.expires_months);
        expiresAt = expiry.toISOString();
      }

      const { error } = await (supabase as any)
        .from("driver_training_progress")
        .upsert({
          organization_id: organizationId,
          driver_id: driverId,
          course_id: courseId,
          status: "in_progress",
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
          attempts: 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: "driver_id,course_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-progress"] });
      toast({ title: "Course started!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start course", description: error.message, variant: "destructive" });
    },
  });

  // Update progress
  const updateProgress = useMutation({
    mutationFn: async ({ 
      driverId, 
      courseId, 
      progressPercent 
    }: { 
      driverId: string; 
      courseId: string; 
      progressPercent: number;
    }) => {
      const { error } = await (supabase as any)
        .from("driver_training_progress")
        .update({
          progress_percent: progressPercent,
          updated_at: new Date().toISOString(),
        })
        .eq("driver_id", driverId)
        .eq("course_id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-progress"] });
    },
  });

  // Complete a course
  const completeCourse = useMutation({
    mutationFn: async ({ 
      driverId, 
      courseId, 
      score 
    }: { 
      driverId: string; 
      courseId: string; 
      score: number;
    }) => {
      const course = courses.find(c => c.id === courseId);
      if (!course) throw new Error("Course not found");

      const passed = score >= course.pass_score;
      
      const { error } = await (supabase as any)
        .from("driver_training_progress")
        .update({
          status: passed ? "completed" : "failed",
          score,
          progress_percent: 100,
          completed_at: passed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("driver_id", driverId)
        .eq("course_id", courseId);
      if (error) throw error;

      return { passed, xpReward: passed ? course.xp_reward : 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training-progress"] });
      if (data.passed) {
        toast({ title: "🎉 Course Completed!", description: `You earned ${data.xpReward} XP!` });
      } else {
        toast({ title: "Course not passed", description: "Try again to improve your score.", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to complete course", description: error.message, variant: "destructive" });
    },
  });

  // Calculate stats
  const stats = {
    totalCourses: courses.length,
    requiredCourses: courses.filter(c => c.is_required).length,
    completedCourses: driverProgress.filter(p => p.status === "completed").length,
    inProgressCourses: driverProgress.filter(p => p.status === "in_progress").length,
    failedCourses: driverProgress.filter(p => p.status === "failed").length,
    overallProgress: courses.length > 0 
      ? Math.round((driverProgress.filter(p => p.status === "completed").length / courses.length) * 100) 
      : 0,
    requiredProgress: courses.filter(c => c.is_required).length > 0
      ? Math.round((driverProgress.filter(p => p.status === "completed" && courses.find(c => c.id === p.course_id)?.is_required).length / courses.filter(c => c.is_required).length) * 100)
      : 100,
  };

  return {
    courses,
    driverProgress,
    allProgress,
    stats,
    isLoading: coursesLoading || progressLoading,
    startCourse,
    updateProgress,
    completeCourse,
  };
};

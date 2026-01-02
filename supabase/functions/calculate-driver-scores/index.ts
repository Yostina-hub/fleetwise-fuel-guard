import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelemetryData {
  speed_kmh: number | null;
  created_at: string;
  latitude?: number;
  longitude?: number;
  engine_on?: boolean;
  device_connected?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { driverId, vehicleId, startDate, endDate } = await req.json();

    if (!driverId || !vehicleId || !startDate || !endDate) {
      throw new Error("Missing required parameters");
    }

    // Fetch telemetry data for the period
    const { data: telemetryData, error: telemetryError } = await supabase
      .from("vehicle_telemetry")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: true });

    if (telemetryError) throw telemetryError;

    if (!telemetryData || telemetryData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No telemetry data found for the period" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate metrics
    const metrics = calculateMetrics(telemetryData);
    
    // Calculate scores
    const scores = calculateScores(metrics);
    
    // Get historical scores for trend calculation
    const { data: historicalScores } = await supabase
      .from("driver_behavior_scores")
      .select("overall_score, created_at")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Generate insights with historical context
    const insights = generateInsights(metrics, scores, historicalScores || []);

    // Get user's organization
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) throw new Error("Not authenticated");

    // Get user's organization from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("User organization not found");
    }

    // Store the score
    const { data: scoreData, error: scoreError } = await supabase
      .from("driver_behavior_scores")
      .insert({
        driver_id: driverId,
        vehicle_id: vehicleId,
        score_period_start: startDate,
        score_period_end: endDate,
        overall_score: scores.overall,
        safety_rating: scores.rating,
        speeding_score: scores.speeding,
        braking_score: scores.braking,
        acceleration_score: scores.acceleration,
        idle_score: scores.idle,
        speed_violations: metrics.speedViolations,
        harsh_braking_events: metrics.harshBraking,
        harsh_acceleration_events: metrics.harshAcceleration,
        total_drive_time: metrics.totalDriveTime,
        total_idle_time: metrics.totalIdleTime,
        total_distance: metrics.totalDistance,
        risk_factors: insights.riskFactors,
        recommendations: insights.recommendations,
        trend: insights.trend,
        organization_id: profile.organization_id,
      })
      .select()
      .single();

    if (scoreError) throw scoreError;

    return new Response(
      JSON.stringify({ success: true, score: scoreData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error calculating driver score:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateMetrics(telemetryData: any[]) {
  let speedViolations = 0;
  let harshBraking = 0;
  let harshAcceleration = 0;
  let totalIdleTime = 0;
  let totalDistance = 0;
  
  const speedLimit = 80; // km/h
  const harshBrakingThreshold = -8; // m/s²
  const harshAccelerationThreshold = 5; // m/s²
  const idleSpeedThreshold = 2; // km/h

  for (let i = 0; i < telemetryData.length; i++) {
    const current = telemetryData[i];
    const currentSpeed = current.speed_kmh || 0;
    
    // Speed violations
    if (currentSpeed > speedLimit) {
      speedViolations++;
    }
    
    // Idle time (speed < 2 km/h but engine on)
    if (currentSpeed < idleSpeedThreshold && current.engine_on) {
      totalIdleTime += 1; // Assuming 1 second per record
    }
    
    // Calculate acceleration/deceleration
    if (i > 0) {
      const previous = telemetryData[i - 1];
      const previousSpeed = previous.speed_kmh || 0;
      const timeDiff = (new Date(current.created_at).getTime() - new Date(previous.created_at).getTime()) / 1000;
      
      if (timeDiff > 0 && timeDiff < 60) { // Only consider if time diff is reasonable (< 60 seconds)
        const acceleration = ((currentSpeed - previousSpeed) * 1000 / 3600) / timeDiff;
        
        if (acceleration < harshBrakingThreshold) {
          harshBraking++;
        } else if (acceleration > harshAccelerationThreshold) {
          harshAcceleration++;
        }
      }
      
      // Calculate distance (approximate)
      const avgSpeed = (currentSpeed + previousSpeed) / 2;
      const timeDiffHours = timeDiff / 3600;
      if (timeDiffHours < 1) { // Only count reasonable time gaps
        totalDistance += avgSpeed * timeDiffHours; // km
      }
    }
  }
  
  const totalDriveTime = telemetryData.length; // seconds (assuming 1 second per record)
  
  return {
    speedViolations,
    harshBraking,
    harshAcceleration,
    totalIdleTime,
    totalDriveTime,
    totalDistance,
  };
}

function calculateScores(metrics: any) {
  // Calculate individual scores (0-100)
  const speedingScore = Math.max(0, 100 - (metrics.speedViolations * 2));
  const brakingScore = Math.max(0, 100 - (metrics.harshBraking * 5));
  const accelerationScore = Math.max(0, 100 - (metrics.harshAcceleration * 5));
  
  // Idle score: penalize excessive idling (more than 20% of drive time)
  const idlePercentage = (metrics.totalIdleTime / metrics.totalDriveTime) * 100;
  const idleScore = idlePercentage > 20 ? Math.max(0, 100 - (idlePercentage - 20) * 2) : 100;
  
  // Overall score (weighted average)
  const overall = Math.round(
    (speedingScore * 0.35) + 
    (brakingScore * 0.25) + 
    (accelerationScore * 0.25) + 
    (idleScore * 0.15)
  );
  
  // Determine safety rating
  let rating: string;
  if (overall >= 90) rating = "excellent";
  else if (overall >= 75) rating = "good";
  else if (overall >= 60) rating = "fair";
  else if (overall >= 40) rating = "poor";
  else rating = "critical";
  
  return {
    overall,
    rating,
    speeding: speedingScore,
    braking: brakingScore,
    acceleration: accelerationScore,
    idle: idleScore,
  };
}

function generateInsights(metrics: any, scores: any, historicalScores: any[]) {
  const riskFactors: string[] = [];
  const recommendations: string[] = [];
  
  // Analyze risk factors
  if (scores.speeding < 70) {
    riskFactors.push("Frequent speeding violations");
    recommendations.push("Implement speed limit awareness training");
  }
  
  if (scores.braking < 70) {
    riskFactors.push("Harsh braking patterns indicating aggressive driving");
    recommendations.push("Practice defensive driving and maintain safe following distance");
  }
  
  if (scores.acceleration < 70) {
    riskFactors.push("Aggressive acceleration leading to fuel waste");
    recommendations.push("Adopt smooth acceleration techniques for fuel efficiency");
  }
  
  if (scores.idle < 70) {
    riskFactors.push("Excessive idling time");
    recommendations.push("Reduce unnecessary engine idling to save fuel and reduce emissions");
  }
  
  // Determine trend based on historical data
  let trend = "stable";
  if (historicalScores.length >= 2) {
    // Calculate average of previous scores
    const previousScores = historicalScores.slice(0, Math.min(3, historicalScores.length));
    const avgPreviousScore = previousScores.reduce((sum, s) => sum + s.overall_score, 0) / previousScores.length;
    
    const scoreDiff = scores.overall - avgPreviousScore;
    if (scoreDiff >= 5) {
      trend = "improving";
    } else if (scoreDiff <= -5) {
      trend = "declining";
    }
  } else if (historicalScores.length === 1) {
    // Compare with single previous score
    const scoreDiff = scores.overall - historicalScores[0].overall_score;
    if (scoreDiff >= 5) {
      trend = "improving";
    } else if (scoreDiff <= -5) {
      trend = "declining";
    }
  }
  
  return {
    riskFactors,
    recommendations,
    trend,
  };
}

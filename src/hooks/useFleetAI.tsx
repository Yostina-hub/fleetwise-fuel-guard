import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "sonner";

export interface AIInsight {
  type: 'warning' | 'success' | 'info' | 'critical';
  title: string;
  description: string;
  metric?: string;
  action?: string;
}

export interface FleetAIResponse {
  summary: string;
  insights: AIInsight[];
  healthScore: number;
  trends: {
    improving: string[];
    declining: string[];
  };
}

export interface AnomalyResult {
  type: 'fuel_theft' | 'route_deviation' | 'speed_anomaly' | 'gps_tampering' | 'idle_excessive' | 'offline_extended';
  severity: 'low' | 'medium' | 'high' | 'critical';
  vehicleId: string;
  vehiclePlate: string;
  description: string;
  detectedAt: string;
  confidence: number;
  recommendedAction: string;
  data?: any;
}

export interface AnomalySummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function useFleetAI() {
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<FleetAIResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [anomalySummary, setAnomalySummary] = useState<AnomalySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (
    insightType: 'dashboard' | 'tracking' | 'speed' | 'fuel',
    context?: any
  ) => {
    if (!organizationId) {
      setError('No organization selected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-fleet-insights', {
        body: { organizationId, insightType, context }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('AI rate limit reached. Please try again in a moment.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else {
          toast.error(data.error);
        }
        setError(data.error);
        return null;
      }

      const parsedInsights = data.insights as FleetAIResponse;
      setInsights(parsedInsights);
      return parsedInsights;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch AI insights';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const detectAnomalies = useCallback(async (
    checkType?: 'fuel' | 'speed' | 'gps' | 'offline' | 'idle'
  ) => {
    if (!organizationId) {
      setError('No organization selected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-anomaly-detector', {
        body: { organizationId, checkType }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        toast.error(data.error);
        setError(data.error);
        return null;
      }

      setAnomalies(data.anomalies || []);
      setAnomalySummary(data.summary || null);
      return { anomalies: data.anomalies, summary: data.summary };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to detect anomalies';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const clearInsights = useCallback(() => {
    setInsights(null);
    setAnomalies([]);
    setAnomalySummary(null);
    setError(null);
  }, []);

  return {
    loading,
    insights,
    anomalies,
    anomalySummary,
    error,
    fetchInsights,
    detectAnomalies,
    clearInsights,
  };
}

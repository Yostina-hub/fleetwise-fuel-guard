// Anomaly Detection - Unusual behavior detection

import { securityAudit } from './securityAudit';

export interface UserBehaviorProfile {
  userId: string;
  loginTimes: number[]; // Hour of day (0-23)
  loginDays: number[]; // Day of week (0-6)
  commonLocations: string[];
  commonDevices: string[];
  avgSessionDuration: number;
  avgActionsPerSession: number;
  lastUpdated: string;
}

export interface AnomalyAlert {
  id: string;
  userId: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
  context: Record<string, any>;
  status: 'new' | 'acknowledged' | 'resolved' | 'false_positive';
}

export type AnomalyType =
  | 'unusual_login_time'
  | 'unusual_location'
  | 'unusual_device'
  | 'excessive_actions'
  | 'unusual_data_access'
  | 'rapid_privilege_changes'
  | 'suspicious_export'
  | 'account_takeover_risk';

interface BehaviorBaseline {
  meanLoginHour: number;
  stdDevLoginHour: number;
  meanActionsPerHour: number;
  stdDevActionsPerHour: number;
}

class AnomalyDetectionSystem {
  private profiles: Map<string, UserBehaviorProfile> = new Map();
  private baselines: Map<string, BehaviorBaseline> = new Map();
  private alerts: AnomalyAlert[] = [];
  private actionCounts: Map<string, { count: number; windowStart: Date }> = new Map();

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    securityAudit.subscribe((event) => {
      if (event.userId) {
        this.analyzeEvent(event.userId, event);
      }
    });
  }

  private analyzeEvent(userId: string, event: any): void {
    // Track action rate
    this.trackActionRate(userId);

    // Check for anomalies
    const profile = this.profiles.get(userId);
    if (!profile) {
      this.initializeProfile(userId);
      return;
    }

    // Check login time anomaly
    if (event.eventType === 'auth.login') {
      const hour = new Date().getHours();
      if (!this.isNormalLoginTime(profile, hour)) {
        this.createAlert(userId, 'unusual_login_time', 'medium', {
          expectedHours: profile.loginTimes,
          actualHour: hour,
        });
      }
    }

    // Check for excessive actions
    const actionRate = this.getActionRate(userId);
    const baseline = this.baselines.get(userId);
    if (baseline && actionRate > baseline.meanActionsPerHour + 3 * baseline.stdDevActionsPerHour) {
      this.createAlert(userId, 'excessive_actions', 'high', {
        actionRate,
        expectedRate: baseline.meanActionsPerHour,
      });
    }

    // Update profile
    this.updateProfile(userId, event);
  }

  private initializeProfile(userId: string): void {
    const profile: UserBehaviorProfile = {
      userId,
      loginTimes: [],
      loginDays: [],
      commonLocations: [],
      commonDevices: [],
      avgSessionDuration: 0,
      avgActionsPerSession: 0,
      lastUpdated: new Date().toISOString(),
    };
    this.profiles.set(userId, profile);
  }

  private updateProfile(userId: string, event: any): void {
    const profile = this.profiles.get(userId);
    if (!profile) return;

    const now = new Date();
    
    if (event.eventType === 'auth.login') {
      profile.loginTimes.push(now.getHours());
      profile.loginDays.push(now.getDay());
      
      // Keep only last 100 entries
      if (profile.loginTimes.length > 100) {
        profile.loginTimes = profile.loginTimes.slice(-100);
        profile.loginDays = profile.loginDays.slice(-100);
      }
    }

    if (event.location && !profile.commonLocations.includes(event.location)) {
      profile.commonLocations.push(event.location);
      if (profile.commonLocations.length > 10) {
        profile.commonLocations = profile.commonLocations.slice(-10);
      }
    }

    profile.lastUpdated = now.toISOString();
    this.profiles.set(userId, profile);
    this.updateBaseline(userId, profile);
  }

  private updateBaseline(userId: string, profile: UserBehaviorProfile): void {
    if (profile.loginTimes.length < 10) return;

    const mean = profile.loginTimes.reduce((a, b) => a + b, 0) / profile.loginTimes.length;
    const variance = profile.loginTimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / profile.loginTimes.length;
    const stdDev = Math.sqrt(variance);

    this.baselines.set(userId, {
      meanLoginHour: mean,
      stdDevLoginHour: stdDev,
      meanActionsPerHour: profile.avgActionsPerSession,
      stdDevActionsPerHour: 5, // Default
    });
  }

  private isNormalLoginTime(profile: UserBehaviorProfile, hour: number): boolean {
    if (profile.loginTimes.length < 5) return true; // Not enough data
    
    const baseline = this.baselines.get(profile.userId);
    if (!baseline) return true;

    const deviation = Math.abs(hour - baseline.meanLoginHour);
    return deviation <= 2 * baseline.stdDevLoginHour + 2; // Allow 2 hours margin
  }

  private trackActionRate(userId: string): void {
    const now = new Date();
    const existing = this.actionCounts.get(userId);
    
    if (existing) {
      const windowDuration = now.getTime() - existing.windowStart.getTime();
      if (windowDuration < 60000) { // 1 minute window
        existing.count++;
      } else {
        this.actionCounts.set(userId, { count: 1, windowStart: now });
      }
    } else {
      this.actionCounts.set(userId, { count: 1, windowStart: now });
    }
  }

  private getActionRate(userId: string): number {
    const data = this.actionCounts.get(userId);
    if (!data) return 0;
    
    const windowDuration = (Date.now() - data.windowStart.getTime()) / 1000 / 60; // minutes
    if (windowDuration === 0) return data.count;
    return (data.count / windowDuration) * 60; // per hour
  }

  private createAlert(
    userId: string,
    type: AnomalyType,
    severity: AnomalyAlert['severity'],
    context: Record<string, any>
  ): AnomalyAlert {
    const alert: AnomalyAlert = {
      id: crypto.randomUUID(),
      userId,
      type,
      severity,
      description: this.getAlertDescription(type),
      detectedAt: new Date().toISOString(),
      context,
      status: 'new',
    };

    this.alerts.unshift(alert);
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(0, 1000);
    }

    return alert;
  }

  private getAlertDescription(type: AnomalyType): string {
    const descriptions: Record<AnomalyType, string> = {
      unusual_login_time: 'Login detected outside normal hours',
      unusual_location: 'Login from an unusual location',
      unusual_device: 'Login from an unrecognized device',
      excessive_actions: 'Unusually high activity rate detected',
      unusual_data_access: 'Unusual data access pattern detected',
      rapid_privilege_changes: 'Rapid privilege changes detected',
      suspicious_export: 'Suspicious data export detected',
      account_takeover_risk: 'Potential account takeover detected',
    };
    return descriptions[type];
  }

  getAlerts(filters?: {
    userId?: string;
    type?: AnomalyType;
    status?: AnomalyAlert['status'];
    severity?: AnomalyAlert['severity'];
  }): AnomalyAlert[] {
    let filtered = [...this.alerts];

    if (filters?.userId) filtered = filtered.filter(a => a.userId === filters.userId);
    if (filters?.type) filtered = filtered.filter(a => a.type === filters.type);
    if (filters?.status) filtered = filtered.filter(a => a.status === filters.status);
    if (filters?.severity) filtered = filtered.filter(a => a.severity === filters.severity);

    return filtered;
  }

  updateAlertStatus(alertId: string, status: AnomalyAlert['status']): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = status;
    }
  }

  getProfile(userId: string): UserBehaviorProfile | undefined {
    return this.profiles.get(userId);
  }

  getStatistics(): {
    totalAlerts: number;
    newAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
  } {
    const alertsBySeverity: Record<string, number> = {};
    const alertsByType: Record<string, number> = {};
    let newAlerts = 0;

    for (const alert of this.alerts) {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      if (alert.status === 'new') newAlerts++;
    }

    return {
      totalAlerts: this.alerts.length,
      newAlerts,
      alertsBySeverity,
      alertsByType,
    };
  }
}

export const anomalyDetection = new AnomalyDetectionSystem();

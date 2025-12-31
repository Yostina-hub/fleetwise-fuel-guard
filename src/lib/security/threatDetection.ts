// Threat Detection and Response System (TDRS) - Real-time threat monitoring

import { securityAudit, AuditEvent } from './securityAudit';

export type ThreatType =
  | 'brute_force'
  | 'credential_stuffing'
  | 'session_hijacking'
  | 'sql_injection'
  | 'xss_attempt'
  | 'suspicious_location'
  | 'impossible_travel'
  | 'api_abuse'
  | 'data_exfiltration'
  | 'privilege_escalation'
  | 'unauthorized_access';

export interface Threat {
  id: string;
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  source: {
    ip?: string;
    userId?: string;
    userAgent?: string;
    location?: string;
  };
  indicators: string[];
  status: 'active' | 'mitigated' | 'investigating' | 'false_positive';
  actions: ThreatAction[];
  relatedEvents: string[];
}

export interface ThreatAction {
  type: 'block_ip' | 'lock_account' | 'require_mfa' | 'alert_admin' | 'log_event';
  executedAt: string;
  success: boolean;
  details?: string;
}

interface ThreatRule {
  id: string;
  name: string;
  description: string;
  conditions: ThreatCondition[];
  severity: Threat['severity'];
  actions: ThreatAction['type'][];
  enabled: boolean;
}

interface ThreatCondition {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'in' | 'matches';
  value: any;
  timeWindow?: number; // seconds
  threshold?: number;
}

class ThreatDetectionSystem {
  private threats: Threat[] = [];
  private rules: ThreatRule[] = [];
  private blockedIPs: Set<string> = new Set();
  private failedLoginAttempts: Map<string, { count: number; firstAttempt: Date }> = new Map();
  private readonly MAX_FAILED_LOGINS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'brute_force_detection',
        name: 'Brute Force Detection',
        description: 'Detects multiple failed login attempts',
        conditions: [
          { field: 'eventType', operator: 'equals', value: 'auth.failed_login' },
          { field: 'count', operator: 'gt', value: 5, timeWindow: 300 },
        ],
        severity: 'high',
        actions: ['block_ip', 'lock_account', 'alert_admin'],
        enabled: true,
      },
      {
        id: 'impossible_travel',
        name: 'Impossible Travel Detection',
        description: 'Detects logins from geographically impossible locations',
        conditions: [
          { field: 'eventType', operator: 'equals', value: 'auth.login' },
          { field: 'distance', operator: 'gt', value: 500, timeWindow: 3600 },
        ],
        severity: 'critical',
        actions: ['require_mfa', 'alert_admin', 'log_event'],
        enabled: true,
      },
      {
        id: 'api_rate_abuse',
        name: 'API Rate Abuse',
        description: 'Detects excessive API requests',
        conditions: [
          { field: 'requestCount', operator: 'gt', value: 1000, timeWindow: 60 },
        ],
        severity: 'medium',
        actions: ['block_ip', 'log_event'],
        enabled: true,
      },
    ];
  }

  private startMonitoring(): void {
    // Subscribe to security audit events
    securityAudit.subscribe((event) => {
      this.analyzeEvent(event);
    });
  }

  private analyzeEvent(event: AuditEvent): void {
    // Check for brute force attacks
    if (event.eventType === 'auth.failed_login' && event.ipAddress) {
      this.trackFailedLogin(event.ipAddress, event.userId);
    }

    // Check against rules
    for (const rule of this.rules.filter(r => r.enabled)) {
      if (this.matchesRule(event, rule)) {
        this.createThreat(rule, event);
      }
    }
  }

  private trackFailedLogin(ip: string, userId?: string): void {
    const key = userId || ip;
    const existing = this.failedLoginAttempts.get(key);
    const now = new Date();

    if (existing) {
      const timeDiff = now.getTime() - existing.firstAttempt.getTime();
      if (timeDiff < this.LOCKOUT_DURATION) {
        existing.count++;
        if (existing.count >= this.MAX_FAILED_LOGINS) {
          this.createThreat(
            this.rules.find(r => r.id === 'brute_force_detection')!,
            { ipAddress: ip, userId } as any
          );
        }
      } else {
        this.failedLoginAttempts.set(key, { count: 1, firstAttempt: now });
      }
    } else {
      this.failedLoginAttempts.set(key, { count: 1, firstAttempt: now });
    }
  }

  private matchesRule(event: AuditEvent, rule: ThreatRule): boolean {
    return rule.conditions.every(condition => {
      const value = (event as any)[condition.field];
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'contains':
          return String(value).includes(condition.value);
        case 'gt':
          return Number(value) > condition.value;
        case 'lt':
          return Number(value) < condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value);
        case 'matches':
          return new RegExp(condition.value).test(String(value));
        default:
          return false;
      }
    });
  }

  private createThreat(rule: ThreatRule, event: Partial<AuditEvent>): Threat {
    const threat: Threat = {
      id: crypto.randomUUID(),
      type: this.ruleToThreatType(rule.id),
      severity: rule.severity,
      detectedAt: new Date().toISOString(),
      source: {
        ip: event.ipAddress,
        userId: event.userId,
        userAgent: event.userAgent,
      },
      indicators: rule.conditions.map(c => `${c.field} ${c.operator} ${c.value}`),
      status: 'active',
      actions: [],
      relatedEvents: event.id ? [event.id] : [],
    };

    this.threats.unshift(threat);

    // Execute actions
    for (const action of rule.actions) {
      this.executeAction(threat, action);
    }

    return threat;
  }

  private ruleToThreatType(ruleId: string): ThreatType {
    const mapping: Record<string, ThreatType> = {
      brute_force_detection: 'brute_force',
      impossible_travel: 'impossible_travel',
      api_rate_abuse: 'api_abuse',
    };
    return mapping[ruleId] || 'unauthorized_access';
  }

  private executeAction(threat: Threat, actionType: ThreatAction['type']): void {
    const action: ThreatAction = {
      type: actionType,
      executedAt: new Date().toISOString(),
      success: true,
    };

    switch (actionType) {
      case 'block_ip':
        if (threat.source.ip) {
          this.blockedIPs.add(threat.source.ip);
          action.details = `Blocked IP: ${threat.source.ip}`;
        }
        break;
      case 'alert_admin':
        console.warn('[THREAT ALERT]', threat);
        action.details = 'Admin alerted';
        break;
      case 'log_event':
        securityAudit.log({
          eventType: 'security.suspicious_activity',
          action: `Threat detected: ${threat.type}`,
          details: { threatId: threat.id, indicators: threat.indicators },
          riskLevel: threat.severity,
          outcome: 'blocked',
        });
        break;
    }

    threat.actions.push(action);
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
  }

  getThreats(filters?: { status?: Threat['status']; severity?: Threat['severity']; limit?: number }): Threat[] {
    let filtered = [...this.threats];

    if (filters?.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    if (filters?.severity) {
      filtered = filtered.filter(t => t.severity === filters.severity);
    }

    return filtered.slice(0, filters?.limit || 50);
  }

  updateThreatStatus(threatId: string, status: Threat['status']): void {
    const threat = this.threats.find(t => t.id === threatId);
    if (threat) {
      threat.status = status;
    }
  }

  getStatistics(): {
    totalThreats: number;
    activeThreats: number;
    threatsBySeverity: Record<string, number>;
    blockedIPs: number;
  } {
    const threatsBySeverity: Record<string, number> = {};
    let activeThreats = 0;

    for (const threat of this.threats) {
      threatsBySeverity[threat.severity] = (threatsBySeverity[threat.severity] || 0) + 1;
      if (threat.status === 'active') activeThreats++;
    }

    return {
      totalThreats: this.threats.length,
      activeThreats,
      threatsBySeverity,
      blockedIPs: this.blockedIPs.size,
    };
  }
}

export const threatDetection = new ThreatDetectionSystem();

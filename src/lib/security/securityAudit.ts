// Security Audit Logging - Activity tracking

export type AuditEventType =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'auth.password_change'
  | 'auth.mfa_enabled'
  | 'auth.mfa_disabled'
  | 'auth.session_expired'
  | 'data.create'
  | 'data.read'
  | 'data.update'
  | 'data.delete'
  | 'data.export'
  | 'security.permission_change'
  | 'security.role_change'
  | 'security.api_key_created'
  | 'security.api_key_revoked'
  | 'security.suspicious_activity'
  | 'system.config_change'
  | 'system.backup'
  | 'system.restore';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  outcome: 'success' | 'failure' | 'blocked';
  sessionId?: string;
}

class SecurityAuditLogger {
  private events: AuditEvent[] = [];
  private readonly maxEventsInMemory = 1000;
  private subscribers: ((event: AuditEvent) => void)[] = [];

  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const fullEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    this.events.unshift(fullEvent);
    if (this.events.length > this.maxEventsInMemory) {
      this.events = this.events.slice(0, this.maxEventsInMemory);
    }

    // Notify subscribers
    this.subscribers.forEach(callback => callback(fullEvent));

    // Log critical events to console in development
    if (fullEvent.riskLevel === 'critical' || fullEvent.riskLevel === 'high') {
      console.warn('[SECURITY AUDIT]', fullEvent);
    }

    return fullEvent;
  }

  subscribe(callback: (event: AuditEvent) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  getEvents(filters?: {
    eventType?: AuditEventType;
    userId?: string;
    riskLevel?: AuditEvent['riskLevel'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditEvent[] {
    let filtered = [...this.events];

    if (filters?.eventType) {
      filtered = filtered.filter(e => e.eventType === filters.eventType);
    }
    if (filters?.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId);
    }
    if (filters?.riskLevel) {
      filtered = filtered.filter(e => e.riskLevel === filters.riskLevel);
    }
    if (filters?.startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= filters.endDate!);
    }

    return filtered.slice(0, filters?.limit || 100);
  }

  getStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByRiskLevel: Record<string, number>;
    recentHighRiskEvents: AuditEvent[];
  } {
    const eventsByType: Record<string, number> = {};
    const eventsByRiskLevel: Record<string, number> = {};

    for (const event of this.events) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      eventsByRiskLevel[event.riskLevel] = (eventsByRiskLevel[event.riskLevel] || 0) + 1;
    }

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsByRiskLevel,
      recentHighRiskEvents: this.events
        .filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical')
        .slice(0, 10),
    };
  }

  clear(): void {
    this.events = [];
  }
}

export const securityAudit = new SecurityAuditLogger();

// Convenience functions
export function logAuthEvent(
  action: 'login' | 'logout' | 'failed_login' | 'password_change',
  userId: string,
  details?: Record<string, any>,
  outcome: AuditEvent['outcome'] = 'success'
): AuditEvent {
  return securityAudit.log({
    eventType: `auth.${action}` as AuditEventType,
    userId,
    action,
    details,
    outcome,
    riskLevel: action === 'failed_login' ? 'medium' : 'low',
  });
}

export function logDataEvent(
  action: 'create' | 'read' | 'update' | 'delete' | 'export',
  resourceType: string,
  resourceId: string,
  userId?: string,
  details?: Record<string, any>
): AuditEvent {
  return securityAudit.log({
    eventType: `data.${action}` as AuditEventType,
    userId,
    resourceType,
    resourceId,
    action,
    details,
    outcome: 'success',
    riskLevel: action === 'delete' || action === 'export' ? 'medium' : 'low',
  });
}

export function logSecurityEvent(
  action: string,
  riskLevel: AuditEvent['riskLevel'],
  details: Record<string, any>,
  userId?: string
): AuditEvent {
  return securityAudit.log({
    eventType: 'security.suspicious_activity',
    userId,
    action,
    details,
    outcome: 'blocked',
    riskLevel,
  });
}

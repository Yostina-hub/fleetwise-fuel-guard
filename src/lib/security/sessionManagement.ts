// Session Management - Concurrent session control and tracking

export interface SessionInfo {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  location?: string;
  createdAt: Date;
  lastActiveAt: Date;
  isCurrent: boolean;
}

export interface SessionConfig {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  enforceOnNewLogin: 'block' | 'terminate_oldest' | 'allow';
  notifyOnNewSession: boolean;
}

const DEFAULT_CONFIG: SessionConfig = {
  maxConcurrentSessions: 3,
  sessionTimeoutMinutes: 60,
  enforceOnNewLogin: 'terminate_oldest',
  notifyOnNewSession: true,
};

class SessionManager {
  private config: SessionConfig;
  private sessions: Map<string, SessionInfo[]>;
  private storageKey = 'session_management_state';
  private currentSessionId: string;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessions = new Map();
    this.currentSessionId = this.generateSessionId();
    this.loadFromStorage();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([userId, sessions]) => {
          this.sessions.set(
            userId,
            (sessions as any[]).map((s) => ({
              ...s,
              createdAt: new Date(s.createdAt),
              lastActiveAt: new Date(s.lastActiveAt),
            }))
          );
        });
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      const data: Record<string, SessionInfo[]> = {};
      this.sessions.forEach((sessions, userId) => {
        data[userId] = sessions;
      });
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  setConfig(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SessionConfig {
    return { ...this.config };
  }

  /**
   * Get device info from browser
   */
  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    const browser = ua.match(/(chrome|safari|firefox|edge|opera)/i)?.[0] || 'Unknown Browser';
    const os = ua.match(/(windows|mac|linux|android|ios)/i)?.[0] || 'Unknown OS';
    return `${browser} on ${os}`;
  }

  /**
   * Register a new session
   */
  registerSession(
    userId: string,
    ipAddress: string = 'Unknown',
    location?: string
  ): { success: boolean; session?: SessionInfo; terminated?: SessionInfo[]; error?: string } {
    const userSessions = this.sessions.get(userId) || [];
    const activeSessions = userSessions.filter((s) => this.isSessionActive(s));

    // Check if max sessions exceeded
    if (activeSessions.length >= this.config.maxConcurrentSessions) {
      switch (this.config.enforceOnNewLogin) {
        case 'block':
          return {
            success: false,
            error: `Maximum ${this.config.maxConcurrentSessions} active sessions allowed. Please log out from another device.`,
          };

        case 'terminate_oldest':
          // Sort by lastActiveAt and terminate oldest
          const sessionsToTerminate = activeSessions
            .sort((a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime())
            .slice(0, activeSessions.length - this.config.maxConcurrentSessions + 1);

          sessionsToTerminate.forEach((s) => {
            const idx = userSessions.findIndex((us) => us.id === s.id);
            if (idx > -1) userSessions.splice(idx, 1);
          });

          const newSession = this.createSession(userId, ipAddress, location);
          userSessions.push(newSession);
          this.sessions.set(userId, userSessions);
          this.saveToStorage();

          return {
            success: true,
            session: newSession,
            terminated: sessionsToTerminate,
          };

        case 'allow':
        default:
          break;
      }
    }

    const newSession = this.createSession(userId, ipAddress, location);
    userSessions.push(newSession);
    this.sessions.set(userId, userSessions);
    this.saveToStorage();

    return { success: true, session: newSession };
  }

  private createSession(userId: string, ipAddress: string, location?: string): SessionInfo {
    return {
      id: this.currentSessionId,
      userId,
      deviceInfo: this.getDeviceInfo(),
      ipAddress,
      location,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      isCurrent: true,
    };
  }

  private isSessionActive(session: SessionInfo): boolean {
    const timeoutMs = this.config.sessionTimeoutMinutes * 60 * 1000;
    return Date.now() - session.lastActiveAt.getTime() < timeoutMs;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): SessionInfo[] {
    const sessions = this.sessions.get(userId) || [];
    return sessions
      .filter((s) => this.isSessionActive(s))
      .map((s) => ({
        ...s,
        isCurrent: s.id === this.currentSessionId,
      }))
      .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
  }

  /**
   * Update last active time for current session
   */
  updateActivity(userId: string): void {
    const sessions = this.sessions.get(userId) || [];
    const session = sessions.find((s) => s.id === this.currentSessionId);
    if (session) {
      session.lastActiveAt = new Date();
      this.saveToStorage();
    }
  }

  /**
   * Terminate a specific session
   */
  terminateSession(userId: string, sessionId: string): boolean {
    const sessions = this.sessions.get(userId) || [];
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx > -1) {
      sessions.splice(idx, 1);
      this.sessions.set(userId, sessions);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Terminate all sessions except current
   */
  terminateOtherSessions(userId: string): number {
    const sessions = this.sessions.get(userId) || [];
    const currentSession = sessions.find((s) => s.id === this.currentSessionId);
    const terminatedCount = sessions.length - (currentSession ? 1 : 0);
    
    this.sessions.set(userId, currentSession ? [currentSession] : []);
    this.saveToStorage();
    
    return terminatedCount;
  }

  /**
   * Logout current session
   */
  logout(userId: string): void {
    this.terminateSession(userId, this.currentSessionId);
    this.currentSessionId = this.generateSessionId();
  }

  /**
   * Get session statistics
   */
  getStatistics(userId: string): {
    totalSessions: number;
    activeSessions: number;
    maxAllowed: number;
    oldestSession: Date | null;
  } {
    const sessions = this.sessions.get(userId) || [];
    const activeSessions = sessions.filter((s) => this.isSessionActive(s));
    const oldest = activeSessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      maxAllowed: this.config.maxConcurrentSessions,
      oldestSession: oldest?.createdAt || null,
    };
  }
}

export const sessionManager = new SessionManager();

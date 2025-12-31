// Login Alerts - Notify on suspicious or new location logins

export interface LoginEvent {
  id: string;
  userId: string;
  timestamp: Date;
  ipAddress: string;
  location?: string;
  deviceInfo: string;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alerts: string[];
  isNewDevice: boolean;
  isNewLocation: boolean;
}

export interface LoginAlertConfig {
  alertOnNewDevice: boolean;
  alertOnNewLocation: boolean;
  alertOnMultipleFailures: boolean;
  failureThreshold: number;
  alertOnUnusualTime: boolean;
  unusualTimeStart: number; // 24-hour format (e.g., 23 for 11 PM)
  unusualTimeEnd: number;   // 24-hour format (e.g., 5 for 5 AM)
  alertOnVpnProxy: boolean;
  emailAlerts: boolean;
  inAppAlerts: boolean;
}

const DEFAULT_CONFIG: LoginAlertConfig = {
  alertOnNewDevice: true,
  alertOnNewLocation: true,
  alertOnMultipleFailures: true,
  failureThreshold: 3,
  alertOnUnusualTime: true,
  unusualTimeStart: 23,
  unusualTimeEnd: 5,
  alertOnVpnProxy: true,
  emailAlerts: true,
  inAppAlerts: true,
};

class LoginAlertManager {
  private config: LoginAlertConfig;
  private loginHistory: Map<string, LoginEvent[]>;
  private knownDevices: Map<string, Set<string>>;
  private knownLocations: Map<string, Set<string>>;
  private pendingAlerts: LoginEvent[];
  private storageKey = 'login_alerts_state';

  constructor(config: Partial<LoginAlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loginHistory = new Map();
    this.knownDevices = new Map();
    this.knownLocations = new Map();
    this.pendingAlerts = [];
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        
        if (data.history) {
          Object.entries(data.history).forEach(([userId, events]) => {
            this.loginHistory.set(
              userId,
              (events as any[]).map((e) => ({
                ...e,
                timestamp: new Date(e.timestamp),
              }))
            );
          });
        }
        
        if (data.devices) {
          Object.entries(data.devices).forEach(([userId, devices]) => {
            this.knownDevices.set(userId, new Set(devices as string[]));
          });
        }
        
        if (data.locations) {
          Object.entries(data.locations).forEach(([userId, locations]) => {
            this.knownLocations.set(userId, new Set(locations as string[]));
          });
        }

        if (data.pendingAlerts) {
          this.pendingAlerts = data.pendingAlerts.map((a: any) => ({
            ...a,
            timestamp: new Date(a.timestamp),
          }));
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        history: Object.fromEntries(
          Array.from(this.loginHistory.entries()).map(([k, v]) => [k, v.slice(-50)]) // Keep last 50
        ),
        devices: Object.fromEntries(
          Array.from(this.knownDevices.entries()).map(([k, v]) => [k, Array.from(v)])
        ),
        locations: Object.fromEntries(
          Array.from(this.knownLocations.entries()).map(([k, v]) => [k, Array.from(v)])
        ),
        pendingAlerts: this.pendingAlerts.slice(-20), // Keep last 20
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  setConfig(config: Partial<LoginAlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LoginAlertConfig {
    return { ...this.config };
  }

  private getDeviceFingerprint(): string {
    const ua = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `${ua}|${screen}|${timezone}`;
  }

  private isUnusualTime(): boolean {
    const hour = new Date().getHours();
    const { unusualTimeStart, unusualTimeEnd } = this.config;
    
    if (unusualTimeStart > unusualTimeEnd) {
      // Spans midnight (e.g., 23-5)
      return hour >= unusualTimeStart || hour < unusualTimeEnd;
    } else {
      // Same day range
      return hour >= unusualTimeStart && hour < unusualTimeEnd;
    }
  }

  private calculateRiskLevel(alerts: string[]): LoginEvent['riskLevel'] {
    if (alerts.length === 0) return 'low';
    if (alerts.length === 1) return 'medium';
    if (alerts.length === 2) return 'high';
    return 'critical';
  }

  /**
   * Record a login attempt and generate alerts
   */
  recordLogin(
    userId: string,
    success: boolean,
    ipAddress: string = 'Unknown',
    location?: string,
    isVpn: boolean = false
  ): LoginEvent {
    const deviceFingerprint = this.getDeviceFingerprint();
    const alerts: string[] = [];
    
    // Check for new device
    const userDevices = this.knownDevices.get(userId) || new Set();
    const isNewDevice = !userDevices.has(deviceFingerprint);
    if (isNewDevice && this.config.alertOnNewDevice && success) {
      alerts.push('Login from new device');
    }
    
    // Check for new location
    const userLocations = this.knownLocations.get(userId) || new Set();
    const isNewLocation = location ? !userLocations.has(location) : false;
    if (isNewLocation && this.config.alertOnNewLocation && success) {
      alerts.push(`Login from new location: ${location}`);
    }
    
    // Check for unusual time
    if (this.config.alertOnUnusualTime && this.isUnusualTime() && success) {
      alerts.push('Login at unusual time');
    }
    
    // Check for VPN/proxy
    if (this.config.alertOnVpnProxy && isVpn && success) {
      alerts.push('Login via VPN/proxy detected');
    }
    
    // Check for multiple failures
    if (this.config.alertOnMultipleFailures && !success) {
      const recentHistory = this.loginHistory.get(userId) || [];
      const recentFailures = recentHistory.filter(
        (e) => !e.success && Date.now() - e.timestamp.getTime() < 3600000 // Last hour
      ).length;
      
      if (recentFailures >= this.config.failureThreshold - 1) {
        alerts.push(`Multiple failed login attempts (${recentFailures + 1})`);
      }
    }

    const event: LoginEvent = {
      id: `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: new Date(),
      ipAddress,
      location,
      deviceInfo: navigator.userAgent.split(' ').slice(-2).join(' '),
      success,
      riskLevel: this.calculateRiskLevel(alerts),
      alerts,
      isNewDevice,
      isNewLocation,
    };

    // Update history
    const history = this.loginHistory.get(userId) || [];
    history.push(event);
    this.loginHistory.set(userId, history.slice(-100)); // Keep last 100

    // Update known devices/locations on successful login
    if (success) {
      userDevices.add(deviceFingerprint);
      this.knownDevices.set(userId, userDevices);
      
      if (location) {
        userLocations.add(location);
        this.knownLocations.set(userId, userLocations);
      }
    }

    // Add to pending alerts if any
    if (alerts.length > 0) {
      this.pendingAlerts.push(event);
    }

    this.saveToStorage();

    return event;
  }

  /**
   * Get login history for a user
   */
  getLoginHistory(userId: string, limit: number = 20): LoginEvent[] {
    return (this.loginHistory.get(userId) || [])
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get pending alerts
   */
  getPendingAlerts(userId?: string): LoginEvent[] {
    if (userId) {
      return this.pendingAlerts.filter((a) => a.userId === userId);
    }
    return [...this.pendingAlerts];
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(alertId: string): void {
    this.pendingAlerts = this.pendingAlerts.filter((a) => a.id !== alertId);
    this.saveToStorage();
  }

  /**
   * Dismiss all alerts for a user
   */
  dismissAllAlerts(userId: string): void {
    this.pendingAlerts = this.pendingAlerts.filter((a) => a.userId !== userId);
    this.saveToStorage();
  }

  /**
   * Mark a device as trusted
   */
  trustDevice(userId: string): void {
    const fingerprint = this.getDeviceFingerprint();
    const devices = this.knownDevices.get(userId) || new Set();
    devices.add(fingerprint);
    this.knownDevices.set(userId, devices);
    this.saveToStorage();
  }

  /**
   * Get statistics
   */
  getStatistics(userId: string): {
    totalLogins: number;
    successfulLogins: number;
    failedLogins: number;
    uniqueDevices: number;
    uniqueLocations: number;
    highRiskEvents: number;
    lastLogin: Date | null;
  } {
    const history = this.loginHistory.get(userId) || [];
    const devices = this.knownDevices.get(userId) || new Set();
    const locations = this.knownLocations.get(userId) || new Set();

    return {
      totalLogins: history.length,
      successfulLogins: history.filter((e) => e.success).length,
      failedLogins: history.filter((e) => !e.success).length,
      uniqueDevices: devices.size,
      uniqueLocations: locations.size,
      highRiskEvents: history.filter((e) => e.riskLevel === 'high' || e.riskLevel === 'critical').length,
      lastLogin: history.length > 0 ? history[history.length - 1].timestamp : null,
    };
  }
}

export const loginAlerts = new LoginAlertManager();

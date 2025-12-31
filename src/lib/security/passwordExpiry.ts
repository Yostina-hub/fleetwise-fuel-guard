// Password Expiry - Enforce password reset after configurable days

export interface PasswordExpiryConfig {
  expiryDays: number;
  warningDays: number;
  enforceExpiry: boolean;
  graceLogins: number;
  excludeAdmins: boolean;
}

export interface PasswordExpiryState {
  lastPasswordChange: Date | null;
  isExpired: boolean;
  isWarning: boolean;
  daysUntilExpiry: number;
  graceLoginsRemaining: number;
  message: string;
}

const DEFAULT_CONFIG: PasswordExpiryConfig = {
  expiryDays: 90,
  warningDays: 14,
  enforceExpiry: true,
  graceLogins: 3,
  excludeAdmins: false,
};

class PasswordExpiryManager {
  private config: PasswordExpiryConfig;
  private userStates: Map<string, { lastChange: number; graceLogins: number }>;
  private storageKey = 'password_expiry_state';

  constructor(config: Partial<PasswordExpiryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.userStates = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.userStates = new Map(Object.entries(data));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.userStates);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  setConfig(config: Partial<PasswordExpiryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): PasswordExpiryConfig {
    return { ...this.config };
  }

  /**
   * Record password change for a user
   */
  recordPasswordChange(userId: string): void {
    this.userStates.set(userId, {
      lastChange: Date.now(),
      graceLogins: this.config.graceLogins,
    });
    this.saveToStorage();
  }

  /**
   * Check password expiry status for a user
   */
  checkExpiry(userId: string, isAdmin: boolean = false): PasswordExpiryState {
    if (!this.config.enforceExpiry || (this.config.excludeAdmins && isAdmin)) {
      return {
        lastPasswordChange: null,
        isExpired: false,
        isWarning: false,
        daysUntilExpiry: Infinity,
        graceLoginsRemaining: Infinity,
        message: 'Password expiry not enforced',
      };
    }

    const state = this.userStates.get(userId);
    
    if (!state) {
      // New user - set initial state and require password change
      this.userStates.set(userId, {
        lastChange: Date.now(),
        graceLogins: this.config.graceLogins,
      });
      this.saveToStorage();
      
      return {
        lastPasswordChange: new Date(),
        isExpired: false,
        isWarning: false,
        daysUntilExpiry: this.config.expiryDays,
        graceLoginsRemaining: this.config.graceLogins,
        message: '',
      };
    }

    const now = Date.now();
    const lastChange = new Date(state.lastChange);
    const daysSinceChange = Math.floor((now - state.lastChange) / (1000 * 60 * 60 * 24));
    const daysUntilExpiry = this.config.expiryDays - daysSinceChange;
    const isExpired = daysUntilExpiry <= 0;
    const isWarning = !isExpired && daysUntilExpiry <= this.config.warningDays;

    let message = '';
    if (isExpired) {
      if (state.graceLogins > 0) {
        message = `Your password has expired. You have ${state.graceLogins} grace login(s) remaining.`;
      } else {
        message = 'Your password has expired. Please change it now.';
      }
    } else if (isWarning) {
      message = `Your password will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Please change it soon.`;
    }

    return {
      lastPasswordChange: lastChange,
      isExpired,
      isWarning,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      graceLoginsRemaining: state.graceLogins,
      message,
    };
  }

  /**
   * Use a grace login (call when expired user logs in without changing password)
   */
  useGraceLogin(userId: string): { allowed: boolean; remaining: number } {
    const state = this.userStates.get(userId);
    
    if (!state) {
      return { allowed: true, remaining: this.config.graceLogins };
    }

    if (state.graceLogins <= 0) {
      return { allowed: false, remaining: 0 };
    }

    state.graceLogins--;
    this.userStates.set(userId, state);
    this.saveToStorage();

    return { allowed: true, remaining: state.graceLogins };
  }

  /**
   * Check if user can login (considering grace logins)
   */
  canLogin(userId: string, isAdmin: boolean = false): { allowed: boolean; requirePasswordChange: boolean; message: string } {
    const expiry = this.checkExpiry(userId, isAdmin);

    if (!expiry.isExpired) {
      return {
        allowed: true,
        requirePasswordChange: false,
        message: expiry.message,
      };
    }

    if (expiry.graceLoginsRemaining > 0) {
      return {
        allowed: true,
        requirePasswordChange: true,
        message: expiry.message,
      };
    }

    return {
      allowed: false,
      requirePasswordChange: true,
      message: 'Your password has expired and no grace logins remain. Please reset your password.',
    };
  }

  /**
   * Get all users with expired or soon-to-expire passwords
   */
  getExpiringUsers(): { userId: string; state: PasswordExpiryState }[] {
    const result: { userId: string; state: PasswordExpiryState }[] = [];

    this.userStates.forEach((_, userId) => {
      const state = this.checkExpiry(userId);
      if (state.isExpired || state.isWarning) {
        result.push({ userId, state });
      }
    });

    return result.sort((a, b) => a.state.daysUntilExpiry - b.state.daysUntilExpiry);
  }

  /**
   * Clear expiry state for a user
   */
  clearUser(userId: string): void {
    this.userStates.delete(userId);
    this.saveToStorage();
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalUsers: number;
    expiredCount: number;
    warningCount: number;
    healthyCount: number;
  } {
    let expired = 0;
    let warning = 0;
    let healthy = 0;

    this.userStates.forEach((_, userId) => {
      const state = this.checkExpiry(userId);
      if (state.isExpired) expired++;
      else if (state.isWarning) warning++;
      else healthy++;
    });

    return {
      totalUsers: this.userStates.size,
      expiredCount: expired,
      warningCount: warning,
      healthyCount: healthy,
    };
  }
}

export const passwordExpiry = new PasswordExpiryManager();

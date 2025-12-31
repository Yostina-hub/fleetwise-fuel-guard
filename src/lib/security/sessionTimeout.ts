// Session Timeout - Auto-logout on inactivity

export interface SessionTimeoutConfig {
  inactivityTimeout: number; // milliseconds
  absoluteTimeout: number; // milliseconds
  warningBefore: number; // milliseconds before timeout to show warning
  extendOnActivity: boolean;
  events: string[]; // DOM events to track for activity
}

export interface SessionState {
  isActive: boolean;
  lastActivity: Date;
  sessionStart: Date;
  timeUntilTimeout: number;
  timeUntilAbsoluteTimeout: number;
  warningShown: boolean;
}

type SessionCallback = (state: SessionState) => void;

const DEFAULT_CONFIG: SessionTimeoutConfig = {
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
  warningBefore: 5 * 60 * 1000, // 5 minutes before
  extendOnActivity: true,
  events: ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'],
};

class SessionTimeoutManager {
  private config: SessionTimeoutConfig = DEFAULT_CONFIG;
  private lastActivity: Date = new Date();
  private sessionStart: Date = new Date();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private warningTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  private isActive: boolean = false;
  private warningShown: boolean = false;
  private callbacks: {
    onTimeout: SessionCallback[];
    onWarning: SessionCallback[];
    onExtend: SessionCallback[];
  } = {
    onTimeout: [],
    onWarning: [],
    onExtend: [],
  };

  setConfig(config: Partial<SessionTimeoutConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.isActive) {
      this.restart();
    }
  }

  getConfig(): SessionTimeoutConfig {
    return { ...this.config };
  }

  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.sessionStart = new Date();
    this.lastActivity = new Date();
    this.warningShown = false;

    // Add event listeners for activity tracking
    this.config.events.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true });
    });

    // Start the timeout check
    this.scheduleTimeouts();

    // Periodic state check
    this.checkIntervalId = setInterval(() => {
      this.checkState();
    }, 1000);
  }

  stop(): void {
    this.isActive = false;

    // Remove event listeners
    this.config.events.forEach(event => {
      document.removeEventListener(event, this.handleActivity);
    });

    // Clear timeouts
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningTimeoutId) clearTimeout(this.warningTimeoutId);
    if (this.checkIntervalId) clearInterval(this.checkIntervalId);

    this.timeoutId = null;
    this.warningTimeoutId = null;
    this.checkIntervalId = null;
  }

  restart(): void {
    this.stop();
    this.start();
  }

  private handleActivity = (): void => {
    if (!this.isActive || !this.config.extendOnActivity) return;

    const now = new Date();
    this.lastActivity = now;
    this.warningShown = false;

    // Reschedule timeouts
    this.scheduleTimeouts();

    // Notify extend callbacks
    this.notifyCallbacks('onExtend');
  };

  private scheduleTimeouts(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningTimeoutId) clearTimeout(this.warningTimeoutId);

    const warningTime = this.config.inactivityTimeout - this.config.warningBefore;

    // Schedule warning
    this.warningTimeoutId = setTimeout(() => {
      if (!this.warningShown) {
        this.warningShown = true;
        this.notifyCallbacks('onWarning');
      }
    }, warningTime);

    // Schedule timeout
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, this.config.inactivityTimeout);
  }

  private handleTimeout(): void {
    this.notifyCallbacks('onTimeout');
    this.stop();
  }

  private checkState(): void {
    const now = new Date();
    
    // Check absolute timeout
    const timeSinceStart = now.getTime() - this.sessionStart.getTime();
    if (timeSinceStart >= this.config.absoluteTimeout) {
      this.handleTimeout();
    }
  }

  private notifyCallbacks(type: keyof typeof this.callbacks): void {
    const state = this.getState();
    this.callbacks[type].forEach(callback => callback(state));
  }

  getState(): SessionState {
    const now = new Date();
    const timeSinceActivity = now.getTime() - this.lastActivity.getTime();
    const timeSinceStart = now.getTime() - this.sessionStart.getTime();

    return {
      isActive: this.isActive,
      lastActivity: this.lastActivity,
      sessionStart: this.sessionStart,
      timeUntilTimeout: Math.max(0, this.config.inactivityTimeout - timeSinceActivity),
      timeUntilAbsoluteTimeout: Math.max(0, this.config.absoluteTimeout - timeSinceStart),
      warningShown: this.warningShown,
    };
  }

  onTimeout(callback: SessionCallback): () => void {
    this.callbacks.onTimeout.push(callback);
    return () => {
      this.callbacks.onTimeout = this.callbacks.onTimeout.filter(cb => cb !== callback);
    };
  }

  onWarning(callback: SessionCallback): () => void {
    this.callbacks.onWarning.push(callback);
    return () => {
      this.callbacks.onWarning = this.callbacks.onWarning.filter(cb => cb !== callback);
    };
  }

  onExtend(callback: SessionCallback): () => void {
    this.callbacks.onExtend.push(callback);
    return () => {
      this.callbacks.onExtend = this.callbacks.onExtend.filter(cb => cb !== callback);
    };
  }

  extend(): void {
    this.lastActivity = new Date();
    this.warningShown = false;
    this.scheduleTimeouts();
    this.notifyCallbacks('onExtend');
  }

  getRemainingTime(): { inactivity: number; absolute: number } {
    const state = this.getState();
    return {
      inactivity: state.timeUntilTimeout,
      absolute: state.timeUntilAbsoluteTimeout,
    };
  }

  formatRemainingTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

export const sessionTimeout = new SessionTimeoutManager();

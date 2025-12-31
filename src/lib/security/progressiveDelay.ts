// Progressive Delay - Exponential backoff for failed login attempts

export interface DelayConfig {
  baseDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
  resetAfterMs: number;
}

export interface DelayState {
  attempts: number;
  lastAttempt: Date | null;
  currentDelayMs: number;
  lockedUntil: Date | null;
  isLocked: boolean;
}

const DEFAULT_CONFIG: DelayConfig = {
  baseDelayMs: 1000,      // 1 second base delay
  maxDelayMs: 300000,     // 5 minutes max delay
  maxAttempts: 10,        // Lock after 10 attempts
  resetAfterMs: 3600000,  // Reset after 1 hour of no attempts
};

class ProgressiveDelayManager {
  private config: DelayConfig;
  private attempts: Map<string, { count: number; lastAttempt: number; lockedUntil: number | null }>;
  private storageKey = 'progressive_delay_state';

  constructor(config: Partial<DelayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.attempts = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.attempts = new Map(Object.entries(data));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.attempts);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  setConfig(config: Partial<DelayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): DelayConfig {
    return { ...this.config };
  }

  /**
   * Calculate the delay for a given number of attempts
   */
  private calculateDelay(attempts: number): number {
    if (attempts <= 1) return 0;
    // Exponential backoff: base * 2^(attempts-1)
    const delay = this.config.baseDelayMs * Math.pow(2, attempts - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Record a failed login attempt and return the delay state
   */
  recordFailedAttempt(identifier: string): DelayState {
    const now = Date.now();
    let state = this.attempts.get(identifier);

    // Reset if enough time has passed since last attempt
    if (state && (now - state.lastAttempt) > this.config.resetAfterMs) {
      state = undefined;
    }

    if (!state) {
      state = { count: 0, lastAttempt: now, lockedUntil: null };
    }

    state.count++;
    state.lastAttempt = now;

    // Lock if max attempts exceeded
    if (state.count >= this.config.maxAttempts) {
      state.lockedUntil = now + this.config.maxDelayMs;
    }

    this.attempts.set(identifier, state);
    this.saveToStorage();

    const currentDelay = this.calculateDelay(state.count);
    const isLocked = state.lockedUntil ? now < state.lockedUntil : false;

    return {
      attempts: state.count,
      lastAttempt: new Date(state.lastAttempt),
      currentDelayMs: currentDelay,
      lockedUntil: state.lockedUntil ? new Date(state.lockedUntil) : null,
      isLocked,
    };
  }

  /**
   * Check the current delay state for an identifier
   */
  getDelayState(identifier: string): DelayState {
    const now = Date.now();
    const state = this.attempts.get(identifier);

    if (!state) {
      return {
        attempts: 0,
        lastAttempt: null,
        currentDelayMs: 0,
        lockedUntil: null,
        isLocked: false,
      };
    }

    // Check if reset is needed
    if ((now - state.lastAttempt) > this.config.resetAfterMs) {
      this.attempts.delete(identifier);
      this.saveToStorage();
      return {
        attempts: 0,
        lastAttempt: null,
        currentDelayMs: 0,
        lockedUntil: null,
        isLocked: false,
      };
    }

    const isLocked = state.lockedUntil ? now < state.lockedUntil : false;
    const currentDelay = this.calculateDelay(state.count);

    return {
      attempts: state.count,
      lastAttempt: new Date(state.lastAttempt),
      currentDelayMs: currentDelay,
      lockedUntil: state.lockedUntil ? new Date(state.lockedUntil) : null,
      isLocked,
    };
  }

  /**
   * Check if login should be delayed
   */
  shouldDelay(identifier: string): { delay: boolean; waitMs: number; message: string } {
    const state = this.getDelayState(identifier);
    const now = Date.now();

    if (state.isLocked && state.lockedUntil) {
      const waitMs = state.lockedUntil.getTime() - now;
      return {
        delay: true,
        waitMs: Math.max(0, waitMs),
        message: `Account temporarily locked. Try again in ${this.formatTime(waitMs)}.`,
      };
    }

    if (state.lastAttempt && state.currentDelayMs > 0) {
      const timeSinceLastAttempt = now - state.lastAttempt.getTime();
      if (timeSinceLastAttempt < state.currentDelayMs) {
        const waitMs = state.currentDelayMs - timeSinceLastAttempt;
        return {
          delay: true,
          waitMs,
          message: `Please wait ${this.formatTime(waitMs)} before trying again.`,
        };
      }
    }

    return { delay: false, waitMs: 0, message: '' };
  }

  /**
   * Reset attempts for an identifier (call on successful login)
   */
  resetAttempts(identifier: string): void {
    this.attempts.delete(identifier);
    this.saveToStorage();
  }

  /**
   * Format milliseconds to human-readable time
   */
  formatTime(ms: number): string {
    if (ms < 1000) return 'a moment';
    
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  /**
   * Clear all stored attempts
   */
  clear(): void {
    this.attempts.clear();
    this.saveToStorage();
  }

  /**
   * Get statistics about current delays
   */
  getStatistics(): { totalIdentifiers: number; lockedIdentifiers: number } {
    const now = Date.now();
    let lockedCount = 0;

    this.attempts.forEach((state) => {
      if (state.lockedUntil && state.lockedUntil > now) {
        lockedCount++;
      }
    });

    return {
      totalIdentifiers: this.attempts.size,
      lockedIdentifiers: lockedCount,
    };
  }
}

export const progressiveDelay = new ProgressiveDelayManager();

// Helper hook data for React components
export function getDelayInfo(identifier: string): {
  canAttempt: boolean;
  waitSeconds: number;
  attempts: number;
  maxAttempts: number;
  message: string;
} {
  const config = progressiveDelay.getConfig();
  const delayCheck = progressiveDelay.shouldDelay(identifier);
  const state = progressiveDelay.getDelayState(identifier);

  return {
    canAttempt: !delayCheck.delay,
    waitSeconds: Math.ceil(delayCheck.waitMs / 1000),
    attempts: state.attempts,
    maxAttempts: config.maxAttempts,
    message: delayCheck.message,
  };
}

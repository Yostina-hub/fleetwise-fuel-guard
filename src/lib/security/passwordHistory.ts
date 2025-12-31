// Password History - Prevents password reuse

export interface PasswordHistoryConfig {
  historyLength: number; // Number of previous passwords to remember
  minAgeDays: number; // Minimum days before reusing a password
}

export interface PasswordHistoryEntry {
  hash: string;
  createdAt: string;
}

const DEFAULT_CONFIG: PasswordHistoryConfig = {
  historyLength: 5,
  minAgeDays: 90,
};

class PasswordHistoryManager {
  private config: PasswordHistoryConfig = DEFAULT_CONFIG;
  private history: Map<string, PasswordHistoryEntry[]> = new Map();
  private readonly STORAGE_KEY = 'password_history';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [userId, entries] of Object.entries(data)) {
          this.history.set(userId, entries as PasswordHistoryEntry[]);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      const data: Record<string, PasswordHistoryEntry[]> = {};
      for (const [userId, entries] of this.history.entries()) {
        data[userId] = entries;
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  setConfig(config: Partial<PasswordHistoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): PasswordHistoryConfig {
    return { ...this.config };
  }

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async addPassword(userId: string, password: string): Promise<void> {
    const hash = await this.hashPassword(password);
    const entries = this.history.get(userId) || [];

    entries.unshift({
      hash,
      createdAt: new Date().toISOString(),
    });

    // Keep only the configured history length
    if (entries.length > this.config.historyLength) {
      entries.splice(this.config.historyLength);
    }

    this.history.set(userId, entries);
    this.saveToStorage();
  }

  async isPasswordReused(userId: string, password: string): Promise<{
    reused: boolean;
    lastUsed?: Date;
    canReuseAfter?: Date;
  }> {
    const hash = await this.hashPassword(password);
    const entries = this.history.get(userId) || [];

    for (const entry of entries) {
      if (entry.hash === hash) {
        const lastUsed = new Date(entry.createdAt);
        const canReuseAfter = new Date(lastUsed);
        canReuseAfter.setDate(canReuseAfter.getDate() + this.config.minAgeDays);

        // Check if enough time has passed
        if (new Date() < canReuseAfter) {
          return {
            reused: true,
            lastUsed,
            canReuseAfter,
          };
        }
      }
    }

    return { reused: false };
  }

  getHistory(userId: string): { count: number; oldestEntry?: Date } {
    const entries = this.history.get(userId) || [];
    return {
      count: entries.length,
      oldestEntry: entries.length > 0 
        ? new Date(entries[entries.length - 1].createdAt)
        : undefined,
    };
  }

  clearHistory(userId: string): void {
    this.history.delete(userId);
    this.saveToStorage();
  }

  async validateNewPassword(userId: string, password: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    const reuseCheck = await this.isPasswordReused(userId, password);
    
    if (reuseCheck.reused) {
      const daysUntilReuse = reuseCheck.canReuseAfter 
        ? Math.ceil((reuseCheck.canReuseAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;
      
      return {
        valid: false,
        error: `This password was recently used. You can reuse it in ${daysUntilReuse} days.`,
      };
    }

    return { valid: true };
  }
}

export const passwordHistory = new PasswordHistoryManager();

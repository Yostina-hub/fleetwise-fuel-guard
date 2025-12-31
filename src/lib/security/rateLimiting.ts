// Rate Limiting - Request throttling

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (identifier: string) => string;
  skipIf?: (identifier: string) => boolean;
  onLimitReached?: (identifier: string, info: RateLimitInfo) => void;
}

export interface RateLimitInfo {
  identifier: string;
  currentRequests: number;
  maxRequests: number;
  windowStart: Date;
  windowEnd: Date;
  remaining: number;
  retryAfter: number; // seconds
  isLimited: boolean;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked: boolean;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.limits.entries()) {
        const config = this.getConfigForKey(key);
        if (now - entry.windowStart > config.windowMs) {
          this.limits.delete(key);
        }
      }
    }, 60000);
  }

  private getConfigForKey(key: string): RateLimitConfig {
    // Find matching config or return default
    for (const [name, config] of this.configs.entries()) {
      if (key.startsWith(name)) {
        return config;
      }
    }
    return this.getDefaultConfig();
  }

  private getDefaultConfig(): RateLimitConfig {
    return {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    };
  }

  configure(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
  }

  check(
    identifier: string,
    configName?: string
  ): RateLimitInfo {
    const config = configName 
      ? this.configs.get(configName) || this.getDefaultConfig()
      : this.getDefaultConfig();
    
    const key = config.keyGenerator 
      ? config.keyGenerator(identifier) 
      : `${configName || 'default'}:${identifier}`;

    // Check skip condition
    if (config.skipIf && config.skipIf(identifier)) {
      return this.createInfo(key, 0, config, false);
    }

    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now - entry.windowStart >= config.windowMs) {
      // New window
      this.limits.set(key, {
        count: 1,
        windowStart: now,
        blocked: false,
      });
      return this.createInfo(key, 1, config, false);
    }

    // Same window
    entry.count++;
    const isLimited = entry.count > config.maxRequests;

    if (isLimited && !entry.blocked) {
      entry.blocked = true;
      config.onLimitReached?.(identifier, this.createInfo(key, entry.count, config, true));
    }

    return this.createInfo(key, entry.count, config, isLimited);
  }

  private createInfo(
    key: string,
    currentRequests: number,
    config: RateLimitConfig,
    isLimited: boolean
  ): RateLimitInfo {
    const entry = this.limits.get(key);
    const windowStart = entry ? new Date(entry.windowStart) : new Date();
    const windowEnd = new Date(windowStart.getTime() + config.windowMs);
    const retryAfter = isLimited 
      ? Math.ceil((windowEnd.getTime() - Date.now()) / 1000)
      : 0;

    return {
      identifier: key,
      currentRequests,
      maxRequests: config.maxRequests,
      windowStart,
      windowEnd,
      remaining: Math.max(0, config.maxRequests - currentRequests),
      retryAfter,
      isLimited,
    };
  }

  reset(identifier: string, configName?: string): void {
    const config = configName 
      ? this.configs.get(configName) || this.getDefaultConfig()
      : this.getDefaultConfig();
    
    const key = config.keyGenerator 
      ? config.keyGenerator(identifier) 
      : `${configName || 'default'}:${identifier}`;

    this.limits.delete(key);
  }

  getStats(): {
    totalEntries: number;
    blockedEntries: number;
    configuredLimits: string[];
  } {
    let blockedEntries = 0;
    for (const entry of this.limits.values()) {
      if (entry.blocked) blockedEntries++;
    }

    return {
      totalEntries: this.limits.size,
      blockedEntries,
      configuredLimits: Array.from(this.configs.keys()),
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
    this.configs.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Pre-configured rate limiters
rateLimiter.configure('auth', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  onLimitReached: (id, info) => {
    console.warn(`[RATE LIMIT] Auth limit reached for ${id}`, info);
  },
});

rateLimiter.configure('api', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

rateLimiter.configure('export', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
});

// Convenience functions
export function checkAuthRateLimit(identifier: string): RateLimitInfo {
  return rateLimiter.check(identifier, 'auth');
}

export function checkApiRateLimit(identifier: string): RateLimitInfo {
  return rateLimiter.check(identifier, 'api');
}

export function checkExportRateLimit(identifier: string): RateLimitInfo {
  return rateLimiter.check(identifier, 'export');
}

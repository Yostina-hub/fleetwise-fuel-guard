/**
 * Idempotency Guard
 * 
 * Prevents duplicate DB records from retried or duplicate GPS/call signals.
 * Uses a composite key: IMEI + timestamp (rounded to second).
 * 
 * Strategy:
 * 1. In-memory LRU set for fast O(1) dedup (handles 99% of cases)
 * 2. DB unique constraint on telemetry_events(event_id, event_time) as backup
 */

class IdempotencyGuard {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100000;  // ~100K entries ≈ 15MB RAM
    this.ttlMs = options.ttlMs || 60000;       // 60s window for dedup
    this._map = new Map();  // key → timestamp
    this._stats = { checked: 0, duplicates: 0, evictions: 0 };

    // Periodic cleanup every 30s
    this._cleanupTimer = setInterval(() => this._cleanup(), 30000);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();
  }

  /**
   * Generate idempotency key from IMEI + event timestamp.
   * Rounds to nearest second to catch near-duplicate pings.
   */
  static generateKey(imei, timestamp) {
    if (!imei) return null;
    const ts = timestamp ? new Date(timestamp).toISOString().slice(0, 19) : new Date().toISOString().slice(0, 19);
    return `${imei}:${ts}`;
  }

  /**
   * Check if this event was already processed.
   * Returns true if DUPLICATE (should be skipped), false if NEW.
   */
  isDuplicate(key) {
    if (!key) return false;
    this._stats.checked++;

    if (this._map.has(key)) {
      this._stats.duplicates++;
      return true;
    }

    // Mark as seen
    this._map.set(key, Date.now());

    // Evict oldest if over capacity
    if (this._map.size > this.maxSize) {
      const firstKey = this._map.keys().next().value;
      this._map.delete(firstKey);
      this._stats.evictions++;
    }

    return false;
  }

  /**
   * Generate event_id for DB insertion (used in telemetry_events table).
   */
  static eventId(imei, timestamp, protocol) {
    const ts = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
    return `${protocol || 'raw'}:${imei}:${ts}`;
  }

  _cleanup() {
    const cutoff = Date.now() - this.ttlMs;
    let cleaned = 0;
    for (const [key, ts] of this._map) {
      if (ts < cutoff) {
        this._map.delete(key);
        cleaned++;
      } else {
        break; // Map preserves insertion order, so we can stop early
      }
    }
    if (cleaned > 0) {
      this._stats.evictions += cleaned;
    }
  }

  getStats() {
    return { ...this._stats, cacheSize: this._map.size };
  }

  shutdown() {
    clearInterval(this._cleanupTimer);
    this._map.clear();
  }
}

module.exports = { IdempotencyGuard };

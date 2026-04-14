/**
 * Internal Event Bus — Decouples core ingestion from side effects.
 * Equivalent of @nestjs/event-emitter but for plain Node.js.
 * 
 * Events:
 *   telemetry.ingested  — new GPS data processed
 *   telemetry.alarm     — alarm event from device
 *   fuel.change         — fuel level change detected
 *   geofence.violation  — vehicle entered/exited geofence
 *   device.connected    — device came online
 *   device.disconnected — device went offline
 */

const { EventEmitter } = require('events');

class TelemetryEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Allow many listeners for decoupled handlers
    this._stats = { emitted: 0, errors: 0 };
  }

  /**
   * Emit an event with error isolation — listener failures don't crash the bus.
   */
  safeEmit(event, data) {
    this._stats.emitted++;
    try {
      this.emit(event, data);
    } catch (err) {
      this._stats.errors++;
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        protocol: 'event-bus',
        message: `Listener error on "${event}"`,
        error: err.message,
      }));
    }
  }

  getStats() {
    return { ...this._stats, listenerCount: this.eventNames().length };
  }
}

// Singleton instance
const eventBus = new TelemetryEventBus();

module.exports = { eventBus };

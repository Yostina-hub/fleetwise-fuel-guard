/**
 * Store & Forward Service (RFP Item 46)
 * 
 * Buffers telemetry data locally when offline and automatically
 * syncs to the server when connectivity is restored.
 * Uses IndexedDB for persistent storage with automatic retry.
 */

const DB_NAME = "fleettrack_store_forward";
const DB_VERSION = 1;
const STORE_NAME = "pending_telemetry";
const MAX_BUFFER_SIZE = 10000;
const SYNC_BATCH_SIZE = 50;
const RETRY_INTERVAL_MS = 30000; // 30 seconds

interface BufferedEvent {
  id: string;
  timestamp: string;
  payload: Record<string, any>;
  retryCount: number;
  createdAt: number;
}

class StoreAndForwardService {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing: boolean = false;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.setupConnectivityListeners();
        this.startPeriodicSync();
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private setupConnectivityListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("[StoreForward] Online - triggering sync");
      this.syncPendingEvents();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("[StoreForward] Offline - buffering events locally");
    });
  }

  private startPeriodicSync(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncPendingEvents();
      }
    }, RETRY_INTERVAL_MS);
  }

  /**
   * Buffer a telemetry event locally.
   * If online, attempts immediate send; if offline, stores for later.
   */
  async bufferEvent(event: Omit<BufferedEvent, "id" | "retryCount" | "createdAt">): Promise<void> {
    const bufferedEvent: BufferedEvent = {
      id: `sf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...event,
      retryCount: 0,
      createdAt: Date.now(),
    };

    if (this.isOnline) {
      try {
        await this.sendEvent(bufferedEvent);
        return;
      } catch {
        // Fall through to local storage
      }
    }

    await this.storeLocally(bufferedEvent);
  }

  private async storeLocally(event: BufferedEvent): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      // Check buffer size and evict oldest if needed
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        if (countRequest.result >= MAX_BUFFER_SIZE) {
          const cursorRequest = store.index("createdAt").openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) cursor.delete();
          };
        }
        store.put(event);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async sendEvent(event: BufferedEvent): Promise<boolean> {
    // Import dynamically to avoid circular deps
    const { supabase } = await import("@/integrations/supabase/client");

    const { error } = await supabase.from("telemetry_events").insert({
      event_id: event.id,
      organization_id: event.payload.organizationId,
      vehicle_id: event.payload.vehicleId || null,
      device_id: event.payload.deviceId || null,
      event_type: event.payload.eventType || "telemetry",
      event_time: event.timestamp,
      payload: event.payload,
      lat: event.payload.lat ?? null,
      lng: event.payload.lng ?? null,
      speed_kmh: event.payload.speedKmh ?? null,
      heading: event.payload.heading ?? null,
      source: event.payload.source || "store_forward",
    });

    if (error) {
      // Duplicate is OK - means it was already synced
      if (error.code === "23505") return true;
      throw error;
    }

    return true;
  }

  /**
   * Sync all pending buffered events to the server.
   */
  async syncPendingEvents(): Promise<{ synced: number; failed: number }> {
    if (!this.db || this.isSyncing || !this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const events = await this.getAllPendingEvents();

      for (let i = 0; i < events.length; i += SYNC_BATCH_SIZE) {
        const batch = events.slice(i, i + SYNC_BATCH_SIZE);

        for (const event of batch) {
          try {
            await this.sendEvent(event);
            await this.removeEvent(event.id);
            synced++;
          } catch {
            event.retryCount++;
            if (event.retryCount > 5) {
              // Drop events that have failed too many times
              await this.removeEvent(event.id);
              failed++;
            } else {
              await this.storeLocally(event);
              failed++;
            }
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }

    if (synced > 0) {
      console.log(`[StoreForward] Synced ${synced} events, ${failed} failed`);
    }

    return { synced, failed };
  }

  private async getAllPendingEvents(): Promise<BufferedEvent[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async removeEvent(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get count of pending (unbuffered) events.
   */
  async getPendingCount(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get connectivity and buffer status.
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }

  destroy(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.db) this.db.close();
    this.db = null;
  }
}

// Singleton instance
export const storeAndForwardService = new StoreAndForwardService();

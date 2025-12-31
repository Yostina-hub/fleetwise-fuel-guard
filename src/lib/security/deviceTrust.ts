// Device Trust Management - Trusted device registry

export interface TrustedDevice {
  id: string;
  userId: string;
  name: string;
  fingerprint: string;
  userAgent: string;
  lastUsed: string;
  createdAt: string;
  trusted: boolean;
  verified: boolean;
  location?: {
    country?: string;
    city?: string;
  };
}

export interface DeviceTrustConfig {
  maxDevicesPerUser: number;
  requireVerification: boolean;
  trustDuration: number; // days
  autoRemoveInactiveAfter: number; // days
}

const DEFAULT_CONFIG: DeviceTrustConfig = {
  maxDevicesPerUser: 5,
  requireVerification: true,
  trustDuration: 30,
  autoRemoveInactiveAfter: 90,
};

class DeviceTrustManager {
  private devices: Map<string, TrustedDevice[]> = new Map();
  private config: DeviceTrustConfig = DEFAULT_CONFIG;
  private readonly STORAGE_KEY = 'trusted_devices';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [userId, devices] of Object.entries(data)) {
          this.devices.set(userId, devices as TrustedDevice[]);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      const data: Record<string, TrustedDevice[]> = {};
      for (const [userId, devices] of this.devices.entries()) {
        data[userId] = devices;
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  setConfig(config: Partial<DeviceTrustConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): DeviceTrustConfig {
    return { ...this.config };
  }

  async registerDevice(
    userId: string,
    fingerprint: string,
    name?: string
  ): Promise<TrustedDevice> {
    const userDevices = this.devices.get(userId) || [];

    // Check if device already exists
    const existing = userDevices.find(d => d.fingerprint === fingerprint);
    if (existing) {
      existing.lastUsed = new Date().toISOString();
      this.saveToStorage();
      return existing;
    }

    // Check max devices limit
    if (userDevices.length >= this.config.maxDevicesPerUser) {
      // Remove oldest device
      userDevices.sort((a, b) => 
        new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime()
      );
      userDevices.shift();
    }

    const device: TrustedDevice = {
      id: crypto.randomUUID(),
      userId,
      name: name || this.generateDeviceName(),
      fingerprint,
      userAgent: navigator.userAgent,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      trusted: !this.config.requireVerification,
      verified: false,
    };

    userDevices.push(device);
    this.devices.set(userId, userDevices);
    this.saveToStorage();

    return device;
  }

  private generateDeviceName(): string {
    const ua = navigator.userAgent;
    let deviceName = 'Unknown Device';

    if (ua.includes('Windows')) deviceName = 'Windows PC';
    else if (ua.includes('Mac')) deviceName = 'Mac';
    else if (ua.includes('iPhone')) deviceName = 'iPhone';
    else if (ua.includes('iPad')) deviceName = 'iPad';
    else if (ua.includes('Android')) deviceName = 'Android Device';
    else if (ua.includes('Linux')) deviceName = 'Linux PC';

    if (ua.includes('Chrome')) deviceName += ' (Chrome)';
    else if (ua.includes('Firefox')) deviceName += ' (Firefox)';
    else if (ua.includes('Safari')) deviceName += ' (Safari)';
    else if (ua.includes('Edge')) deviceName += ' (Edge)';

    return deviceName;
  }

  isTrusted(userId: string, fingerprint: string): boolean {
    const userDevices = this.devices.get(userId) || [];
    const device = userDevices.find(d => d.fingerprint === fingerprint);
    
    if (!device) return false;
    if (!device.trusted) return false;

    // Check trust expiration
    const trustExpiry = new Date(device.createdAt);
    trustExpiry.setDate(trustExpiry.getDate() + this.config.trustDuration);
    if (new Date() > trustExpiry) {
      device.trusted = false;
      this.saveToStorage();
      return false;
    }

    return true;
  }

  trustDevice(userId: string, deviceId: string): boolean {
    const userDevices = this.devices.get(userId) || [];
    const device = userDevices.find(d => d.id === deviceId);
    
    if (!device) return false;
    
    device.trusted = true;
    device.verified = true;
    this.saveToStorage();
    return true;
  }

  untrustDevice(userId: string, deviceId: string): boolean {
    const userDevices = this.devices.get(userId) || [];
    const device = userDevices.find(d => d.id === deviceId);
    
    if (!device) return false;
    
    device.trusted = false;
    this.saveToStorage();
    return true;
  }

  removeDevice(userId: string, deviceId: string): boolean {
    const userDevices = this.devices.get(userId) || [];
    const index = userDevices.findIndex(d => d.id === deviceId);
    
    if (index === -1) return false;
    
    userDevices.splice(index, 1);
    this.devices.set(userId, userDevices);
    this.saveToStorage();
    return true;
  }

  getDevices(userId: string): TrustedDevice[] {
    return [...(this.devices.get(userId) || [])];
  }

  removeInactiveDevices(userId: string): number {
    const userDevices = this.devices.get(userId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.autoRemoveInactiveAfter);

    const activeDevices = userDevices.filter(d => 
      new Date(d.lastUsed) > cutoffDate
    );

    const removed = userDevices.length - activeDevices.length;
    this.devices.set(userId, activeDevices);
    this.saveToStorage();

    return removed;
  }

  updateLastUsed(userId: string, fingerprint: string): void {
    const userDevices = this.devices.get(userId) || [];
    const device = userDevices.find(d => d.fingerprint === fingerprint);
    
    if (device) {
      device.lastUsed = new Date().toISOString();
      this.saveToStorage();
    }
  }

  renameDevice(userId: string, deviceId: string, newName: string): boolean {
    const userDevices = this.devices.get(userId) || [];
    const device = userDevices.find(d => d.id === deviceId);
    
    if (!device) return false;
    
    device.name = newName;
    this.saveToStorage();
    return true;
  }

  clearAllDevices(userId: string): void {
    this.devices.delete(userId);
    this.saveToStorage();
  }
}

export const deviceTrust = new DeviceTrustManager();

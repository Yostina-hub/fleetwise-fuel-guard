// Geo-Blocking - Country-based access control

export interface GeoBlockingConfig {
  mode: 'allowlist' | 'blocklist';
  countries: string[];
  enabled: boolean;
  logAttempts: boolean;
  customMessages: Record<string, string>;
}

export interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
}

export interface GeoBlockResult {
  allowed: boolean;
  reason?: string;
  location?: GeoLocation;
}

const DEFAULT_CONFIG: GeoBlockingConfig = {
  mode: 'blocklist',
  countries: [],
  enabled: false,
  logAttempts: true,
  customMessages: {
    blocked: 'Access from your location is not permitted.',
    error: 'Unable to verify your location.',
  },
};

class GeoBlockingService {
  private config: GeoBlockingConfig = DEFAULT_CONFIG;
  private locationCache: Map<string, { location: GeoLocation; expires: number }> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  setConfig(config: Partial<GeoBlockingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): GeoBlockingConfig {
    return { ...this.config };
  }

  async checkAccess(ip: string): Promise<GeoBlockResult> {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    try {
      const location = await this.getLocation(ip);
      if (!location) {
        return {
          allowed: true, // Allow on error by default
          reason: 'Location lookup failed',
        };
      }

      const countryCode = location.countryCode.toUpperCase();
      const isInList = this.config.countries.some(
        c => c.toUpperCase() === countryCode
      );

      let allowed: boolean;
      if (this.config.mode === 'allowlist') {
        allowed = isInList;
      } else {
        allowed = !isInList;
      }

      return {
        allowed,
        reason: allowed ? undefined : this.config.customMessages.blocked,
        location,
      };
    } catch (error) {
      console.error('Geo-blocking check failed:', error);
      return {
        allowed: true,
        reason: this.config.customMessages.error,
      };
    }
  }

  async getLocation(ip: string): Promise<GeoLocation | null> {
    // Check cache
    const cached = this.locationCache.get(ip);
    if (cached && cached.expires > Date.now()) {
      return cached.location;
    }

    try {
      // Use a free IP geolocation API (example - replace with actual service)
      // Note: In production, use a proper IP geolocation service
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      if (!response.ok) {
        throw new Error('Geolocation lookup failed');
      }

      const data = await response.json();
      const location: GeoLocation = {
        ip,
        country: data.country_name || 'Unknown',
        countryCode: data.country_code || 'XX',
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org,
      };

      // Cache the result
      this.locationCache.set(ip, {
        location,
        expires: Date.now() + this.CACHE_TTL,
      });

      return location;
    } catch (error) {
      console.error('Geo lookup failed:', error);
      return null;
    }
  }

  addCountry(countryCode: string): void {
    const code = countryCode.toUpperCase();
    if (!this.config.countries.includes(code)) {
      this.config.countries.push(code);
    }
  }

  removeCountry(countryCode: string): void {
    const code = countryCode.toUpperCase();
    this.config.countries = this.config.countries.filter(c => c !== code);
  }

  clearCache(): void {
    this.locationCache.clear();
  }
}

export const geoBlocking = new GeoBlockingService();

// Common country codes for reference
export const COUNTRY_CODES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  CN: 'China',
  RU: 'Russia',
  BR: 'Brazil',
  IN: 'India',
  ET: 'Ethiopia',
  KE: 'Kenya',
  NG: 'Nigeria',
  ZA: 'South Africa',
  EG: 'Egypt',
  // Add more as needed
};

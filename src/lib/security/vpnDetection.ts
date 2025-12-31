// VPN/Proxy Detection - VPN/proxy identification

export interface VPNDetectionResult {
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  isHosting: boolean;
  riskScore: number; // 0-100
  details: {
    provider?: string;
    type?: string;
    asn?: string;
    asnOrg?: string;
  };
}

export interface VPNDetectionConfig {
  enabled: boolean;
  blockVPN: boolean;
  blockProxy: boolean;
  blockTor: boolean;
  blockDatacenter: boolean;
  allowlist: string[]; // Allowed IPs even if detected as VPN
  riskThreshold: number; // Block if risk score above this
}

const DEFAULT_CONFIG: VPNDetectionConfig = {
  enabled: true,
  blockVPN: false,
  blockProxy: false,
  blockTor: true,
  blockDatacenter: false,
  allowlist: [],
  riskThreshold: 80,
};

// Known VPN/Proxy ASN ranges (simplified list)
const KNOWN_VPN_ASNS = [
  '20473',  // Choopa/Vultr
  '14061',  // DigitalOcean
  '16276',  // OVH
  '24940',  // Hetzner
  '63949',  // Linode
  '132203', // Tencent Cloud
];

// Known Tor exit node patterns
const TOR_INDICATORS = [
  'tor-exit',
  'torservers',
  'tornode',
];

class VPNDetectionService {
  private config: VPNDetectionConfig = DEFAULT_CONFIG;
  private cache: Map<string, { result: VPNDetectionResult; expires: number }> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  setConfig(config: Partial<VPNDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): VPNDetectionConfig {
    return { ...this.config };
  }

  async detect(ip: string): Promise<VPNDetectionResult> {
    if (!this.config.enabled) {
      return this.createSafeResult();
    }

    // Check allowlist
    if (this.config.allowlist.includes(ip)) {
      return this.createSafeResult();
    }

    // Check cache
    const cached = this.cache.get(ip);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }

    try {
      const result = await this.performDetection(ip);
      
      // Cache result
      this.cache.set(ip, {
        result,
        expires: Date.now() + this.CACHE_TTL,
      });

      return result;
    } catch (error) {
      console.error('VPN detection failed:', error);
      return this.createSafeResult();
    }
  }

  private async performDetection(ip: string): Promise<VPNDetectionResult> {
    // Perform multiple detection methods
    const [ipInfo, reverseCheck] = await Promise.all([
      this.getIPInfo(ip),
      this.reverseHostnameCheck(ip),
    ]);

    let riskScore = 0;
    let isVPN = false;
    let isProxy = false;
    let isTor = false;
    let isDatacenter = false;
    let isHosting = false;

    // Check ASN
    if (ipInfo.asn && KNOWN_VPN_ASNS.includes(ipInfo.asn)) {
      isDatacenter = true;
      isHosting = true;
      riskScore += 30;
    }

    // Check reverse hostname for Tor indicators
    if (reverseCheck.hostname) {
      const hostname = reverseCheck.hostname.toLowerCase();
      if (TOR_INDICATORS.some(ind => hostname.includes(ind))) {
        isTor = true;
        riskScore += 50;
      }
      
      // Check for VPN/proxy indicators in hostname
      if (hostname.includes('vpn') || hostname.includes('proxy')) {
        isVPN = hostname.includes('vpn');
        isProxy = hostname.includes('proxy');
        riskScore += 40;
      }
    }

    // Check for datacenter IP ranges
    if (ipInfo.type === 'hosting' || ipInfo.type === 'datacenter') {
      isDatacenter = true;
      riskScore += 25;
    }

    // Normalize risk score
    riskScore = Math.min(100, riskScore);

    return {
      isVPN,
      isProxy,
      isTor,
      isDatacenter,
      isHosting,
      riskScore,
      details: {
        provider: ipInfo.org,
        type: ipInfo.type,
        asn: ipInfo.asn,
        asnOrg: ipInfo.asnOrg,
      },
    };
  }

  private async getIPInfo(ip: string): Promise<{
    asn?: string;
    asnOrg?: string;
    org?: string;
    type?: string;
  }> {
    try {
      // Using ipapi.co for IP info (replace with your preferred service)
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      if (!response.ok) return {};
      
      const data = await response.json();
      return {
        asn: data.asn?.replace('AS', ''),
        asnOrg: data.org,
        org: data.org,
        type: data.type,
      };
    } catch {
      return {};
    }
  }

  private async reverseHostnameCheck(ip: string): Promise<{ hostname?: string }> {
    // In a real implementation, you would do a reverse DNS lookup
    // This is simplified for client-side use
    return { hostname: undefined };
  }

  private createSafeResult(): VPNDetectionResult {
    return {
      isVPN: false,
      isProxy: false,
      isTor: false,
      isDatacenter: false,
      isHosting: false,
      riskScore: 0,
      details: {},
    };
  }

  shouldBlock(result: VPNDetectionResult): { blocked: boolean; reason?: string } {
    if (result.isTor && this.config.blockTor) {
      return { blocked: true, reason: 'Tor network detected' };
    }
    if (result.isVPN && this.config.blockVPN) {
      return { blocked: true, reason: 'VPN detected' };
    }
    if (result.isProxy && this.config.blockProxy) {
      return { blocked: true, reason: 'Proxy detected' };
    }
    if (result.isDatacenter && this.config.blockDatacenter) {
      return { blocked: true, reason: 'Datacenter IP detected' };
    }
    if (result.riskScore >= this.config.riskThreshold) {
      return { blocked: true, reason: `High risk score: ${result.riskScore}` };
    }
    return { blocked: false };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const vpnDetection = new VPNDetectionService();

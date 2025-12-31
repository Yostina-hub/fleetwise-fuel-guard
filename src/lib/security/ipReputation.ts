// IP Reputation Scoring - IP risk assessment

export interface IPReputationResult {
  ip: string;
  score: number; // 0-100 (higher = more trustworthy)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: ReputationFactor[];
  recommendations: string[];
  lastChecked: Date;
}

export interface ReputationFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-1
  details?: string;
}

export interface IPReputationConfig {
  enabled: boolean;
  cacheTimeout: number; // milliseconds
  blockThreshold: number; // Block if score below this
  warnThreshold: number; // Warn if score below this
}

const DEFAULT_CONFIG: IPReputationConfig = {
  enabled: true,
  cacheTimeout: 24 * 60 * 60 * 1000, // 24 hours
  blockThreshold: 20,
  warnThreshold: 50,
};

// Known bad IP ranges (simplified - in production use actual threat intel)
const KNOWN_BAD_RANGES = [
  // Example ranges - not real bad IPs
];

class IPReputationService {
  private config: IPReputationConfig = DEFAULT_CONFIG;
  private cache: Map<string, { result: IPReputationResult; expires: number }> = new Map();
  private localReputationData: Map<string, { score: number; events: string[] }> = new Map();

  setConfig(config: Partial<IPReputationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): IPReputationConfig {
    return { ...this.config };
  }

  async checkReputation(ip: string): Promise<IPReputationResult> {
    if (!this.config.enabled) {
      return this.createNeutralResult(ip);
    }

    // Check cache
    const cached = this.cache.get(ip);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }

    const result = await this.calculateReputation(ip);
    
    // Cache result
    this.cache.set(ip, {
      result,
      expires: Date.now() + this.config.cacheTimeout,
    });

    return result;
  }

  private async calculateReputation(ip: string): Promise<IPReputationResult> {
    const factors: ReputationFactor[] = [];
    let baseScore = 70; // Start with neutral-good score

    // Check local reputation data
    const localData = this.localReputationData.get(ip);
    if (localData) {
      factors.push({
        name: 'Local History',
        impact: localData.score > 0 ? 'positive' : 'negative',
        weight: 0.3,
        details: `${localData.events.length} recorded events`,
      });
      baseScore += localData.score;
    }

    // Check if it's a private IP (generally safe)
    if (this.isPrivateIP(ip)) {
      factors.push({
        name: 'Private Network',
        impact: 'positive',
        weight: 0.2,
        details: 'IP is from a private network range',
      });
      baseScore += 15;
    }

    // Check known bad ranges
    if (this.isInBadRange(ip)) {
      factors.push({
        name: 'Known Threat Source',
        impact: 'negative',
        weight: 0.5,
        details: 'IP is in a known malicious range',
      });
      baseScore -= 50;
    }

    // Normalize score
    const score = Math.max(0, Math.min(100, baseScore));
    const riskLevel = this.scoreToRiskLevel(score);

    return {
      ip,
      score,
      riskLevel,
      factors,
      recommendations: this.generateRecommendations(score, factors),
      lastChecked: new Date(),
    };
  }

  private createNeutralResult(ip: string): IPReputationResult {
    return {
      ip,
      score: 70,
      riskLevel: 'low',
      factors: [],
      recommendations: [],
      lastChecked: new Date(),
    };
  }

  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 127.0.0.0/8 (localhost)
    if (parts[0] === 127) return true;

    return false;
  }

  private isInBadRange(ip: string): boolean {
    // In production, check against actual threat intelligence
    return KNOWN_BAD_RANGES.some(range => ip.startsWith(range));
  }

  private scoreToRiskLevel(score: number): IPReputationResult['riskLevel'] {
    if (score >= 70) return 'low';
    if (score >= 50) return 'medium';
    if (score >= 20) return 'high';
    return 'critical';
  }

  private generateRecommendations(score: number, factors: ReputationFactor[]): string[] {
    const recommendations: string[] = [];

    if (score < this.config.blockThreshold) {
      recommendations.push('Consider blocking this IP address');
    }
    if (score < this.config.warnThreshold) {
      recommendations.push('Enable additional verification for this IP');
      recommendations.push('Monitor activity closely');
    }

    const negativeFactors = factors.filter(f => f.impact === 'negative');
    if (negativeFactors.length > 0) {
      recommendations.push('Review security logs for suspicious activity');
    }

    return recommendations;
  }

  reportMalicious(ip: string, reason: string): void {
    const existing = this.localReputationData.get(ip) || { score: 0, events: [] };
    existing.score -= 20;
    existing.events.push(`Reported: ${reason} (${new Date().toISOString()})`);
    this.localReputationData.set(ip, existing);
    
    // Invalidate cache
    this.cache.delete(ip);
  }

  reportGood(ip: string, reason: string): void {
    const existing = this.localReputationData.get(ip) || { score: 0, events: [] };
    existing.score += 10;
    existing.events.push(`Good behavior: ${reason} (${new Date().toISOString()})`);
    this.localReputationData.set(ip, existing);
    
    // Invalidate cache
    this.cache.delete(ip);
  }

  shouldBlock(result: IPReputationResult): boolean {
    return result.score < this.config.blockThreshold;
  }

  shouldWarn(result: IPReputationResult): boolean {
    return result.score < this.config.warnThreshold;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getStatistics(): {
    cachedEntries: number;
    localDataEntries: number;
    averageScore: number;
  } {
    let totalScore = 0;
    let count = 0;

    for (const cached of this.cache.values()) {
      totalScore += cached.result.score;
      count++;
    }

    return {
      cachedEntries: this.cache.size,
      localDataEntries: this.localReputationData.size,
      averageScore: count > 0 ? Math.round(totalScore / count) : 70,
    };
  }
}

export const ipReputation = new IPReputationService();

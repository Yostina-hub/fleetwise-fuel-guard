// Security Headers - CSP/HSTS configuration helpers

export interface SecurityHeadersConfig {
  contentSecurityPolicy: ContentSecurityPolicyConfig;
  strictTransportSecurity: HSTSConfig;
  xFrameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  xContentTypeOptions: boolean;
  referrerPolicy: ReferrerPolicy;
  permissionsPolicy: PermissionsPolicyConfig;
}

export interface ContentSecurityPolicyConfig {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  frameSrc: string[];
  objectSrc: string[];
  mediaSrc: string[];
  workerSrc: string[];
  childSrc: string[];
  formAction: string[];
  frameAncestors: string[];
  upgradeInsecureRequests: boolean;
  blockAllMixedContent: boolean;
  reportUri?: string;
}

export interface HSTSConfig {
  maxAge: number; // seconds
  includeSubDomains: boolean;
  preload: boolean;
}

export interface PermissionsPolicyConfig {
  camera: string[];
  microphone: string[];
  geolocation: string[];
  payment: string[];
  usb: string[];
  fullscreen: string[];
  autoplay: string[];
}

type ReferrerPolicy = 
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'same-origin'
  | 'origin'
  | 'strict-origin'
  | 'origin-when-cross-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

const DEFAULT_CSP: ContentSecurityPolicyConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
  frameSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  workerSrc: ["'self'", 'blob:'],
  childSrc: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
  upgradeInsecureRequests: true,
  blockAllMixedContent: true,
};

const DEFAULT_CONFIG: SecurityHeadersConfig = {
  contentSecurityPolicy: DEFAULT_CSP,
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: ["'self'"],
    payment: [],
    usb: [],
    fullscreen: ["'self'"],
    autoplay: [],
  },
};

class SecurityHeadersService {
  private config: SecurityHeadersConfig = DEFAULT_CONFIG;

  setConfig(config: Partial<SecurityHeadersConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      contentSecurityPolicy: {
        ...this.config.contentSecurityPolicy,
        ...config.contentSecurityPolicy,
      },
      strictTransportSecurity: {
        ...this.config.strictTransportSecurity,
        ...config.strictTransportSecurity,
      },
      permissionsPolicy: {
        ...this.config.permissionsPolicy,
        ...config.permissionsPolicy,
      },
    };
  }

  getConfig(): SecurityHeadersConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  generateCSP(): string {
    const csp = this.config.contentSecurityPolicy;
    const directives: string[] = [];

    const addDirective = (name: string, values: string[]) => {
      if (values.length > 0) {
        directives.push(`${name} ${values.join(' ')}`);
      }
    };

    addDirective('default-src', csp.defaultSrc);
    addDirective('script-src', csp.scriptSrc);
    addDirective('style-src', csp.styleSrc);
    addDirective('img-src', csp.imgSrc);
    addDirective('font-src', csp.fontSrc);
    addDirective('connect-src', csp.connectSrc);
    addDirective('frame-src', csp.frameSrc);
    addDirective('object-src', csp.objectSrc);
    addDirective('media-src', csp.mediaSrc);
    addDirective('worker-src', csp.workerSrc);
    addDirective('child-src', csp.childSrc);
    addDirective('form-action', csp.formAction);
    addDirective('frame-ancestors', csp.frameAncestors);

    if (csp.upgradeInsecureRequests) {
      directives.push('upgrade-insecure-requests');
    }
    if (csp.blockAllMixedContent) {
      directives.push('block-all-mixed-content');
    }
    if (csp.reportUri) {
      directives.push(`report-uri ${csp.reportUri}`);
    }

    return directives.join('; ');
  }

  generateHSTS(): string {
    const hsts = this.config.strictTransportSecurity;
    let value = `max-age=${hsts.maxAge}`;
    
    if (hsts.includeSubDomains) {
      value += '; includeSubDomains';
    }
    if (hsts.preload) {
      value += '; preload';
    }
    
    return value;
  }

  generatePermissionsPolicy(): string {
    const pp = this.config.permissionsPolicy;
    const directives: string[] = [];

    for (const [key, values] of Object.entries(pp)) {
      const value = values.length === 0 
        ? '()' 
        : `(${values.join(' ')})`;
      directives.push(`${key}=${value}`);
    }

    return directives.join(', ');
  }

  getAllHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': this.generateCSP(),
      'Strict-Transport-Security': this.generateHSTS(),
      'X-Frame-Options': this.config.xFrameOptions,
      'X-Content-Type-Options': this.config.xContentTypeOptions ? 'nosniff' : '',
      'Referrer-Policy': this.config.referrerPolicy,
      'Permissions-Policy': this.generatePermissionsPolicy(),
    };
  }

  // Apply meta tags for CSP (client-side fallback)
  applyMetaTags(): void {
    const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existingMeta) {
      existingMeta.setAttribute('content', this.generateCSP());
    } else {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = this.generateCSP();
      document.head.appendChild(meta);
    }
  }

  validateCSP(cspString: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    if (cspString.includes("'unsafe-inline'") && cspString.includes('script-src')) {
      warnings.push("'unsafe-inline' in script-src weakens CSP protection");
    }
    if (cspString.includes("'unsafe-eval'")) {
      warnings.push("'unsafe-eval' allows dynamic code execution");
    }
    if (!cspString.includes('default-src')) {
      warnings.push("Missing 'default-src' directive");
    }
    if (cspString.includes('*')) {
      warnings.push("Wildcard '*' allows any source");
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
}

export const securityHeaders = new SecurityHeadersService();

// CAPTCHA Integration - Bot protection

export interface CaptchaConfig {
  enabled: boolean;
  provider: 'recaptcha' | 'hcaptcha' | 'turnstile' | 'simple';
  siteKey?: string;
  threshold: number; // Score threshold for invisible captcha (0-1)
  actions: string[]; // Actions that require captcha
}

export interface CaptchaResult {
  success: boolean;
  score?: number;
  action?: string;
  timestamp?: Date;
  hostname?: string;
  errorCodes?: string[];
}

const DEFAULT_CONFIG: CaptchaConfig = {
  enabled: false,
  provider: 'simple',
  threshold: 0.5,
  actions: ['login', 'register', 'reset_password', 'contact'],
};

class CaptchaService {
  private config: CaptchaConfig = DEFAULT_CONFIG;
  private simpleCaptchaAnswer: string = '';

  setConfig(config: Partial<CaptchaConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CaptchaConfig {
    return { ...this.config };
  }

  isRequired(action: string): boolean {
    return this.config.enabled && this.config.actions.includes(action);
  }

  // Simple math CAPTCHA for basic protection
  generateSimpleCaptcha(): { question: string; answer: string } {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let answer: number;
    switch (operator) {
      case '+':
        answer = num1 + num2;
        break;
      case '-':
        answer = num1 - num2;
        break;
      case '*':
        answer = num1 * num2;
        break;
      default:
        answer = num1 + num2;
    }

    this.simpleCaptchaAnswer = answer.toString();
    return {
      question: `What is ${num1} ${operator} ${num2}?`,
      answer: this.simpleCaptchaAnswer,
    };
  }

  verifySimpleCaptcha(userAnswer: string): CaptchaResult {
    const success = userAnswer.trim() === this.simpleCaptchaAnswer;
    this.simpleCaptchaAnswer = ''; // Clear after verification
    
    return {
      success,
      score: success ? 1 : 0,
      timestamp: new Date(),
      errorCodes: success ? [] : ['invalid-answer'],
    };
  }

  // Honeypot field verification
  checkHoneypot(honeypotValue: string): boolean {
    // Honeypot should be empty (bots often fill all fields)
    return honeypotValue === '';
  }

  // Time-based verification (bots fill forms too fast)
  checkFormTiming(formStartTime: number, minSeconds: number = 3): boolean {
    const elapsed = (Date.now() - formStartTime) / 1000;
    return elapsed >= minSeconds;
  }

  // Keyboard/mouse behavior analysis (simplified)
  analyzeUserBehavior(events: { type: string; timestamp: number }[]): {
    score: number;
    suspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let score = 1;

    // Check for too few events (bots often don't generate normal events)
    if (events.length < 5) {
      score -= 0.3;
      reasons.push('Low interaction count');
    }

    // Check for too regular timing (bots have consistent timing)
    if (events.length > 2) {
      const intervals: number[] = [];
      for (let i = 1; i < events.length; i++) {
        intervals.push(events[i].timestamp - events[i - 1].timestamp);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, int) => 
        sum + Math.pow(int - avgInterval, 2), 0) / intervals.length;
      
      // Too consistent timing is suspicious
      if (variance < 100) {
        score -= 0.3;
        reasons.push('Suspiciously consistent timing');
      }
    }

    // Check for no mouse movement
    const hasMouseMove = events.some(e => e.type === 'mousemove');
    if (!hasMouseMove) {
      score -= 0.2;
      reasons.push('No mouse movement detected');
    }

    return {
      score: Math.max(0, score),
      suspicious: score < 0.5,
      reasons,
    };
  }

  // Generate challenge for custom CAPTCHA
  generateChallenge(): {
    id: string;
    type: 'image' | 'audio' | 'text';
    data: string;
    expiresAt: Date;
  } {
    const challenges = [
      'Select all images with traffic lights',
      'Type the characters shown in the image',
      'Solve the puzzle to continue',
    ];

    return {
      id: crypto.randomUUID(),
      type: 'text',
      data: challenges[Math.floor(Math.random() * challenges.length)],
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };
  }
}

export const captcha = new CaptchaService();

// Utility hook for form protection
export function createFormProtection() {
  const startTime = Date.now();
  const events: { type: string; timestamp: number }[] = [];

  const trackEvent = (type: string) => {
    events.push({ type, timestamp: Date.now() });
  };

  const verify = (honeypotValue: string = ''): {
    passed: boolean;
    reasons: string[];
  } => {
    const reasons: string[] = [];

    // Check honeypot
    if (!captcha.checkHoneypot(honeypotValue)) {
      reasons.push('Honeypot field filled');
    }

    // Check timing
    if (!captcha.checkFormTiming(startTime)) {
      reasons.push('Form submitted too quickly');
    }

    // Check behavior
    const behavior = captcha.analyzeUserBehavior(events);
    if (behavior.suspicious) {
      reasons.push(...behavior.reasons);
    }

    return {
      passed: reasons.length === 0,
      reasons,
    };
  };

  return { trackEvent, verify, startTime };
}

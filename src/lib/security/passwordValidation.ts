// Password Validation - Strength checking and policy enforcement

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxLength?: number;
}

export interface PasswordStrengthResult {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
  feedback: string[];
  meetsPolicy: boolean;
  policyViolations: string[];
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
};

export function validatePasswordStrength(
  password: string,
  policy: PasswordPolicy = DEFAULT_POLICY
): PasswordStrengthResult {
  const feedback: string[] = [];
  const policyViolations: string[] = [];
  let score = 0;

  // Length checks
  if (password.length >= policy.minLength) {
    score += 20;
  } else {
    policyViolations.push(`Password must be at least ${policy.minLength} characters`);
  }

  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  if (policy.maxLength && password.length > policy.maxLength) {
    policyViolations.push(`Password must be at most ${policy.maxLength} characters`);
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 15;
  } else if (policy.requireUppercase) {
    policyViolations.push('Password must contain at least one uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 15;
  } else if (policy.requireLowercase) {
    policyViolations.push('Password must contain at least one lowercase letter');
  }

  // Numbers check
  if (/[0-9]/.test(password)) {
    score += 15;
  } else if (policy.requireNumbers) {
    policyViolations.push('Password must contain at least one number');
  }

  // Special characters check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  } else if (policy.requireSpecialChars) {
    policyViolations.push('Password must contain at least one special character');
  }

  // Common patterns penalty
  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 10;
    feedback.push('Consider adding numbers and special characters');
  }

  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push('Avoid repeating characters');
  }

  // Common passwords check (simplified)
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
    score -= 30;
    feedback.push('Avoid common password patterns');
  }

  // Normalize score
  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level: PasswordStrengthResult['level'];
  if (score < 20) level = 'weak';
  else if (score < 40) level = 'fair';
  else if (score < 60) level = 'good';
  else if (score < 80) level = 'strong';
  else level = 'very_strong';

  return {
    score,
    level,
    feedback,
    meetsPolicy: policyViolations.length === 0,
    policyViolations,
  };
}

export function generateSecurePassword(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, x => chars[x % chars.length]).join('');
}

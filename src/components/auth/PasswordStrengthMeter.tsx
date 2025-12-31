import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains a number', test: (p) => /\d/.test(p) },
  { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const analysis = useMemo(() => {
    const passedCount = requirements.filter((r) => r.test(password)).length;
    const percentage = (passedCount / requirements.length) * 100;
    
    let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    let color = 'bg-destructive';
    let label = 'Weak';
    
    if (passedCount >= 5) {
      strength = 'strong';
      color = 'bg-success';
      label = 'Strong';
    } else if (passedCount >= 4) {
      strength = 'good';
      color = 'bg-secondary';
      label = 'Good';
    } else if (passedCount >= 3) {
      strength = 'fair';
      color = 'bg-warning';
      label = 'Fair';
    }

    return {
      passedCount,
      percentage,
      strength,
      color,
      label,
      requirements: requirements.map((r) => ({
        ...r,
        passed: r.test(password),
      })),
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={`font-medium ${
            analysis.strength === 'strong' ? 'text-success' :
            analysis.strength === 'good' ? 'text-secondary' :
            analysis.strength === 'fair' ? 'text-warning' :
            'text-destructive'
          }`}>
            {analysis.label}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${analysis.color}`}
            style={{ width: `${analysis.percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-1.5">
        {analysis.requirements.map((req, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 text-xs transition-all duration-300 ${
              req.passed ? 'text-success' : 'text-muted-foreground'
            }`}
          >
            {req.passed ? (
              <Check className="w-3 h-3 animate-scale-in" />
            ) : (
              <X className="w-3 h-3" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

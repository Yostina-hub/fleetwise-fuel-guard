import { useState, useEffect, useRef } from 'react';

interface UseAnimatedCounterOptions {
  duration?: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut';
  delay?: number;
  decimals?: number;
  separator?: string;
}

const easingFunctions = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

export function useAnimatedCounter(
  endValue: number,
  options: UseAnimatedCounterOptions = {}
) {
  const {
    duration = 1500,
    easing = 'easeOut',
    delay = 0,
    decimals = 0,
    separator = ',',
  } = options;

  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const previousValueRef = useRef(0);

  useEffect(() => {
    const startValue = previousValueRef.current;
    previousValueRef.current = endValue;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startAnimation = () => {
      setIsAnimating(true);
      startTimeRef.current = null;

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = currentTime;
        }

        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easingFunctions[easing](progress);

        const currentValue = startValue + (endValue - startValue) * easedProgress;
        setDisplayValue(currentValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
          setIsAnimating(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [endValue, duration, easing, delay]);

  const formattedValue = displayValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  return {
    value: displayValue,
    formattedValue,
    isAnimating,
  };
}

// Component version for easier use
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1500,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const { formattedValue } = useAnimatedCounter(value, { duration, decimals });

  return (
    <span className={`count-up ${className}`}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}

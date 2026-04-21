/**
 * StarRating
 * ----------
 * Polished, animated 1-5 star input. Hover preview, keyboard support,
 * and a contextual descriptor below the stars (e.g. "Excellent").
 */
import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number; // 0 = unrated
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** Show the textual descriptor below the stars. */
  showLabel?: boolean;
  className?: string;
}

const LABELS: Record<number, { text: string; tone: string }> = {
  1: { text: "Poor", tone: "text-destructive" },
  2: { text: "Below average", tone: "text-orange-500" },
  3: { text: "Average", tone: "text-yellow-500" },
  4: { text: "Good", tone: "text-emerald-500" },
  5: { text: "Excellent", tone: "text-primary" },
};

const SIZES = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-9 w-9",
};

export function StarRating({
  value,
  onChange,
  size = "md",
  disabled,
  showLabel = true,
  className,
}: StarRatingProps) {
  const [hover, setHover] = React.useState(0);
  const display = hover || value;
  const label = LABELS[display];

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
        role="radiogroup"
        aria-label="Rating"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= display;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onMouseEnter={() => !disabled && setHover(n)}
              onFocus={() => !disabled && setHover(n)}
              onBlur={() => setHover(0)}
              onClick={() => !disabled && onChange(n)}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "ArrowRight") onChange(Math.min(5, value + 1));
                if (e.key === "ArrowLeft") onChange(Math.max(1, value - 1));
              }}
              className={cn(
                "rounded-md p-0.5 outline-none transition-all duration-150",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                !disabled && "hover:scale-110 active:scale-95",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <Star
                className={cn(
                  SIZES[size],
                  "transition-colors duration-150",
                  filled
                    ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                    : "fill-transparent text-muted-foreground/40",
                )}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>
      {showLabel && (
        <div className="h-4 text-xs font-medium">
          {label ? (
            <span className={cn("transition-colors", label.tone)}>
              {label.text}
            </span>
          ) : (
            <span className="text-muted-foreground/50">Tap to rate</span>
          )}
        </div>
      )}
    </div>
  );
}

export default StarRating;

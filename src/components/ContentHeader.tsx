import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

interface ContentHeaderProps {
  className?: string;
}

export function ContentHeader({ className }: ContentHeaderProps) {
  return (
    <div className={cn(
      "flex items-center justify-end px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm",
      className
    )}>
      <ThemeToggle />
    </div>
  );
}

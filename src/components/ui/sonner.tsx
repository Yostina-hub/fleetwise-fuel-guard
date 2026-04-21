import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Centralized, professional toaster used app-wide for all CRUD operations.
 *
 * - Theme-aware (light / dark / system)
 * - Glassmorphism + branded accent borders per state (success / error / warning / info / loading)
 * - Rich colors, icons, and a subtle slide-in animation
 * - Accessible: pauses on hover/focus, dismissable, sensible default duration
 *
 * Usage anywhere in the app:
 *   import { toast } from "sonner";
 *   toast.success("Driver created");
 *   toast.error("Failed to save", { description: err.message });
 *
 * Or use the CRUD helpers in `@/lib/toast` for consistent messaging.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      richColors
      closeButton
      expand
      visibleToasts={4}
      gap={10}
      offset={16}
      duration={4000}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="h-5 w-5" />,
        error: <XCircle className="h-5 w-5" />,
        warning: <AlertTriangle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
        loading: <Loader2 className="h-5 w-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: [
            "group toast pointer-events-auto",
            "flex items-start gap-3 w-full",
            "rounded-xl border px-4 py-3.5",
            "backdrop-blur-xl supports-[backdrop-filter]:bg-background/85",
            "group-[.toaster]:bg-background/95 group-[.toaster]:text-foreground",
            "group-[.toaster]:border-border/60",
            "group-[.toaster]:shadow-[0_10px_40px_-12px_hsl(var(--foreground)/0.25)]",
            "data-[type=success]:border-l-4 data-[type=success]:border-l-success",
            "data-[type=error]:border-l-4 data-[type=error]:border-l-destructive",
            "data-[type=warning]:border-l-4 data-[type=warning]:border-l-warning",
            "data-[type=info]:border-l-4 data-[type=info]:border-l-secondary",
            "data-[type=loading]:border-l-4 data-[type=loading]:border-l-primary",
            "transition-all duration-200",
          ].join(" "),
          title: "text-sm font-semibold leading-tight tracking-tight",
          description: "group-[.toast]:text-muted-foreground text-xs mt-0.5 leading-snug",
          actionButton: [
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            "group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5",
            "group-[.toast]:text-xs group-[.toast]:font-medium",
            "group-[.toast]:hover:bg-primary/90 group-[.toast]:transition-colors",
          ].join(" "),
          cancelButton: [
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            "group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5",
            "group-[.toast]:text-xs group-[.toast]:font-medium",
            "group-[.toast]:hover:bg-muted/80 group-[.toast]:transition-colors",
          ].join(" "),
          closeButton: [
            "group-[.toast]:bg-background group-[.toast]:text-muted-foreground",
            "group-[.toast]:border-border/60 group-[.toast]:hover:bg-muted",
            "group-[.toast]:hover:text-foreground group-[.toast]:transition-colors",
          ].join(" "),
          success: "group-[.toaster]:text-success",
          error: "group-[.toaster]:text-destructive",
          warning: "group-[.toaster]:text-warning",
          info: "group-[.toaster]:text-secondary",
          loading: "group-[.toaster]:text-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

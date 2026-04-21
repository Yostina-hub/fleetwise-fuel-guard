/**
 * PrefetchLink
 * ------------
 * Drop-in replacement for react-router's <Link> that warms the lazy-loaded
 * route chunk on `mouseenter`, `focus`, and `touchstart`. Eliminates the
 * "page hangs for a few seconds on first navigation" lag without changing
 * the visual API of the sidebar.
 *
 * Behaviour matches <Link>; we just intercept the existing hover/focus
 * handlers (preserving any caller-provided ones) and forward everything
 * else verbatim.
 */
import { forwardRef } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { prefetchRoute } from "@/lib/routePrefetch";

const toPath = (to: LinkProps["to"]): string | undefined => {
  if (typeof to === "string") return to;
  if (to && typeof to === "object" && "pathname" in to && to.pathname) {
    return to.pathname;
  }
  return undefined;
};

export const PrefetchLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, onMouseEnter, onFocus, onTouchStart, ...rest }, ref) => {
    const path = toPath(to);
    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={(e) => {
          prefetchRoute(path);
          onMouseEnter?.(e);
        }}
        onFocus={(e) => {
          prefetchRoute(path);
          onFocus?.(e);
        }}
        onTouchStart={(e) => {
          prefetchRoute(path);
          onTouchStart?.(e);
        }}
        {...rest}
      />
    );
  },
);

PrefetchLink.displayName = "PrefetchLink";

export default PrefetchLink;

import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const onWheel = (e: WheelEvent) => {
        const max = el.scrollWidth - el.clientWidth;
        if (max <= 0) return;

        const deltaX = Math.abs(e.deltaX) > 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(e.deltaY);

        if (absX === 0 || absX <= absY) return;

        // Prevent page-level overscroll/back-swipe and keep scroll inside the table container.
        e.preventDefault();
        el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + deltaX));
      };

      let startX = 0;
      let startY = 0;
      let startScrollLeft = 0;

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startScrollLeft = el.scrollLeft;
      };

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;

        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        const max = el.scrollWidth - el.clientWidth;
        if (max <= 0) return;

        if (Math.abs(dx) <= Math.abs(dy)) return;

        e.preventDefault();
        el.scrollLeft = Math.min(max, Math.max(0, startScrollLeft - dx));
      };

      el.addEventListener("wheel", onWheel, { passive: false });
      el.addEventListener("touchstart", onTouchStart, { passive: true });
      el.addEventListener("touchmove", onTouchMove, { passive: false });

      return () => {
        el.removeEventListener("wheel", onWheel as EventListener);
        el.removeEventListener("touchstart", onTouchStart as EventListener);
        el.removeEventListener("touchmove", onTouchMove as EventListener);
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className="relative w-full overflow-x-auto overflow-y-visible overscroll-x-contain"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
      >
        <table ref={ref} className={cn("w-full caption-bottom text-sm min-w-max", className)} {...props} />
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };

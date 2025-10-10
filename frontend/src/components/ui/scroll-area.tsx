/**
 * ScrollArea Component - shadcn/ui compatible
 * Scrollable area component with custom scrollbar styling
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
  orientation?: "vertical" | "horizontal" | "both";
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, orientation = "vertical", ...props }, ref) => {
    const getOverflowClass = () => {
      switch (orientation) {
        case "horizontal":
          return "overflow-x-auto overflow-y-hidden";
        case "both":
          return "overflow-auto";
        case "vertical":
        default:
          return "overflow-y-auto overflow-x-hidden";
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative",
          getOverflowClass(),
          "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };

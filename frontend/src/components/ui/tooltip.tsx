import * as React from "react";

export const TooltipProvider = ({ children }: { children: React.ReactNode; delayDuration?: number }) => (
  <>{children}</>
);

export const Tooltip = ({ children }: { children: React.ReactNode }) => (
  <div className="relative inline-flex group/tooltip">{children}</div>
);

export const TooltipTrigger = ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
  <>{children}</>
);

export const TooltipContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span
    role="tooltip"
    className={`pointer-events-none absolute -bottom-8 right-0 z-50 hidden whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[11px] text-white shadow group-hover/tooltip:block ${className}`}
  >
    {children}
  </span>
);

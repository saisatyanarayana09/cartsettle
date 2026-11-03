import * as React from "react";
import { cn } from "@/lib/utils";

export const Shimmer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span className={cn("inline-block animate-pulse text-muted-foreground font-medium", className)}>
    {children}
  </span>
);

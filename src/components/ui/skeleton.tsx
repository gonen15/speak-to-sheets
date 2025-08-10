import React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("julius-skeleton", className)}
      {...props}
    />
  )
}

type JuliusSkeletonProps = {
  className?: string;
  variant?: "text" | "card" | "kpi" | "chart";
  lines?: number;
};

function JuliusSkeleton({ 
  className, 
  variant = "text", 
  lines = 1 
}: JuliusSkeletonProps) {
  if (variant === "card") {
    return (
      <div className={cn("julius-card p-6", className)}>
        <div className="julius-skeleton h-4 w-20 mb-2" />
        <div className="julius-skeleton h-8 w-32 mb-4" />
        <div className="julius-skeleton h-3 w-full" />
      </div>
    );
  }

  if (variant === "kpi") {
    return (
      <div className={cn("julius-card p-6", className)}>
        <div className="julius-skeleton h-3 w-16 mb-2" />
        <div className="julius-skeleton h-10 w-24 mb-2" />
        <div className="julius-skeleton h-3 w-12" />
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={cn("julius-card p-4", className)}>
        <div className="julius-skeleton h-80 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "julius-skeleton h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export { Skeleton, JuliusSkeleton }

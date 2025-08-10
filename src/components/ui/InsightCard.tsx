import React from "react";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type InsightCardProps = {
  title?: string;
  summary: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  }>;
  type?: "insight" | "warning" | "success";
  className?: string;
};

export default function InsightCard({
  title = "תובנות והמלצות",
  summary,
  actions = [],
  type = "insight",
  className
}: InsightCardProps) {
  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-success" />;
      default:
        return <TrendingUp className="h-5 w-5 text-primary" />;
    }
  };

  const getBorderClass = () => {
    switch (type) {
      case "warning":
        return "border-l-warning";
      case "success":
        return "border-l-success";
      default:
        return "border-l-primary";
    }
  };

  return (
    <div className={cn("julius-card p-6 border-l-4", getBorderClass(), className)}>
      <div className="flex items-start gap-3 mb-4">
        {getIcon()}
        <div className="flex-1">
          <h3 className="julius-label mb-2">{title}</h3>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {summary}
          </div>
        </div>
      </div>
      
      {actions.length > 0 && (
        <div className="julius-toolbar">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={cn(
                "julius-btn text-xs",
                action.variant === "primary" && "primary"
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
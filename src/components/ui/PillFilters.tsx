import React from "react";
import { cn } from "@/lib/utils";

type Opt = { label: string; value: string };

export default function PillFilters({
  options,
  value,
  onChange,
  className
}: {
  options: Opt[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("julius-toolbar", className)}>
      {options.map(o => (
        <button 
          key={o.value} 
          className={cn("julius-pill", value === o.value && "active")}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

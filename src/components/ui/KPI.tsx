import React from "react";
import { cn } from "@/lib/utils";

type Props = { 
  label: string; 
  value: number|null|undefined; 
  format?: "number"|"currency"|"percent"; 
  hint?: string;
  delta?: number;
  deltaLabel?: string;
  className?: string;
};

const fmt = (n:any, kind:Props["format"]="number")=>{
  if(n==null||Number.isNaN(Number(n))) return "—";
  const v=Number(n);
  if(kind==="currency") return new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);
  if(kind==="percent") return `${(v*100).toFixed(1)}%`;
  return new Intl.NumberFormat().format(v);
};

const formatDelta = (delta: number, format?: Props["format"]) => {
  const sign = delta >= 0 ? "+" : "";
  if(format === "percent") return `${sign}${(delta*100).toFixed(1)}%`;
  if(format === "currency") return `${sign}${fmt(delta, "currency")}`;
  return `${sign}${fmt(delta, "number")}`;
};

export default function KPI({label, value, format, hint, delta, deltaLabel, className}: Props) {
  return (
    <div className={cn("julius-card p-6", className)}>
      <div className="julius-label mb-2">{label}</div>
      <div className="julius-value mb-1">{fmt(value, format)}</div>
      {delta !== undefined && (
        <div className={cn("julius-delta", delta >= 0 ? "positive" : "negative")}>
          {formatDelta(delta, format)} {deltaLabel && `${deltaLabel}`}
        </div>
      )}
      {hint && <div className="text-xs text-muted-foreground mt-2">{hint}</div>}
    </div>
  );
}

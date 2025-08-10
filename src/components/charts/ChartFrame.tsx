import React from "react";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

export function MinimalTooltip({ active, payload, label }: any){
  if(!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="julius-card p-3 text-sm">
      <div className="julius-label mb-1">{label}</div>
      <div className="font-medium">
        <span className="text-muted-foreground">{p.name || p.dataKey}:</span>{" "}
        <span className="text-foreground">{new Intl.NumberFormat().format(Number(p.value||0))}</span>
      </div>
    </div>
  );
}

/** Julius-style chart frame with minimal design */
export default function ChartFrame({
  data, 
  render,
  height = 320,
  className
}: {
  data: any[]; 
  render: (common: React.ReactNode) => React.ReactElement;
  height?: number;
  className?: string;
}) {
  const common = (
    <>
      <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.5} />
      <XAxis 
        dataKey="name" 
        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
        axisLine={false} 
        tickLine={false}
      />
      <YAxis 
        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
        axisLine={false} 
        tickLine={false} 
        width={60}
      />
      <Tooltip content={<MinimalTooltip/>}/>
    </>
  );
  
  return (
    <div className={`julius-card p-4 ${className || ""}`}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {render(common)}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

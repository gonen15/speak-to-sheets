import React from "react";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

export function MinimalTooltip({ active, payload, label }: any){
  if(!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="card p-2 text-xs">
      <div className="mb-1 text-slate-500">{label}</div>
      <div><b>{p.name || p.dataKey}:</b> {new Intl.NumberFormat().format(Number(p.value||0))}</div>
    </div>
  );
}

export default function ChartFrame({children}:{children:React.ReactElement}){
  const child = React.Children.only(children) as React.ReactElement;
  const enhanced = React.cloneElement(child, {
    children: (
      <>
        {child.props.children}
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize:12, fill:'#64748b' }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fontSize:12, fill:'#64748b' }} axisLine={false} tickLine={false} width={48}/>
        <Tooltip content={<MinimalTooltip/>}/>
      </>
    )
  });

  return (
    <div className="card p-3 h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        {enhanced}
      </ResponsiveContainer>
    </div>
  );
}

import React from "react";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

export function MinimalTooltip({ active, payload, label }: any){
  if(!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="card" style={{padding:8}}>
      <div className="label" style={{marginBottom:4}}>{label}</div>
      <div style={{fontSize:12}}><b>{p.name || p.dataKey}:</b> {new Intl.NumberFormat().format(Number(p.value||0))}</div>
    </div>
  );
}

/** render-prop שמזריק צירים/גריד/טולטיפ אל תוך ה-Bar/LineChart */
export default function ChartFrame({data, render}:{data:any[]; render:(common:React.ReactNode)=>React.ReactElement}){
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis dataKey="name" tick={{ fontSize:12, fill:"#64748b" }} axisLine={false} tickLine={false}/>
      <YAxis tick={{ fontSize:12, fill:"#64748b" }} axisLine={false} tickLine={false} width={48}/>
      <Tooltip content={<MinimalTooltip/>}/>
    </>
  );
  return (
    <div className="card" style={{padding:12}}>
      <div style={{height:320}}>
        <ResponsiveContainer width="100%" height="100%">
          {render(common)}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

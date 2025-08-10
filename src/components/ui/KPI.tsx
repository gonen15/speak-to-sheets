import React from "react";

type Props = { label:string; value:number|null|undefined; format?:"number"|"currency"|"percent"; hint?:string };
const fmt = (n:any, kind:Props["format"]="number")=>{
  if(n==null||Number.isNaN(Number(n))) return "—";
  const v=Number(n);
  if(kind==="currency") return new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);
  if(kind==="percent") return `${(v*100).toFixed(1)}%`;
  return new Intl.NumberFormat().format(v);
};
export default function KPI({label,value,format,hint}:Props){
  return (
    <div className="card p-4">
      <div className="label mb-1">{label}</div>
      <div className="value">{fmt(value,format)}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

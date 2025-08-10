import React from "react";

type Opt = { label:string; value:string };
export default function PillFilters({options,value,onChange}:{options:Opt[];value:string;onChange:(v:string)=>void}){
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(o=> (
        <button key={o.value} className="pill text-sm" data-active={value===o.value} onClick={()=>onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

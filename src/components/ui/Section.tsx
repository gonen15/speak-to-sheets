import React from "react";
export default function Section({title,actions,children}:{title:string;actions?:React.ReactNode;children:React.ReactNode}){
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        <div className="flex gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

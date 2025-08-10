// Save/Get dashboard and Run widget queries (dataset or monday).
// Requires: JWT verify. Uses RPC aggregate_dataset and aggregate_items.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req)=>{
  if (req.method==="OPTIONS") return new Response(null,{headers:cors});
  const auth = req.headers.get("Authorization"); if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global:{ headers:{ Authorization: auth }}});

  try{
    const url = new URL(req.url);
    let path = url.pathname.split("/").pop() || ""; // "save" | "get" | "run" | "dashboard"

    // Parse body once if POST
    let body: any = null;
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { body = {}; }
    }

    // Allow action routing when invoked at base path (functions.invoke can't use subpaths)
    if ((path === "dashboard" || path === "") && body?.action) {
      path = String(body.action);
    }

    if (path==="save" && req.method==="POST"){
      const { dashboard, widgets } = body as { dashboard:any, widgets:any[] };
      if (!dashboard?.name) throw new Error("dashboard.name required");
      // upsert dashboard (owner is current user)
      const { data: me } = await supabase.auth.getUser();
      const base = { ...dashboard, created_by: me?.user?.id } as any;
      const { data: d, error } = await supabase.from("user_dashboards").upsert(base).select("*").maybeSingle();
      if (error) throw error;

      if (Array.isArray(widgets)){
        for (const w of widgets){
          const row = { ...w, dashboard_id: d.id } as any;
          const { error: wErr } = await supabase.from("dashboard_widgets").upsert(row);
          if (wErr) throw wErr;
        }
      }
      return new Response(JSON.stringify({ ok:true, dashboard: d }), { status:200, headers:{...cors,"Content-Type":"application/json"}});
    }

    if (path==="get" && (req.method==="GET" || req.method==="POST")){
      const id = (req.method === 'GET') ? url.searchParams.get("id") : body?.id;
      if (!id) throw new Error("id is required");
      const { data: dash, error } = await supabase.from("user_dashboards").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      const { data: widgets } = await supabase.from("dashboard_widgets").select("*").eq("dashboard_id", id);
      return new Response(JSON.stringify({ ok:true, dashboard: dash, widgets }), { status:200, headers:{...cors,"Content-Type":"application/json"}});
    }

    if (path==="run" && req.method==="POST"){
      const q = body?.query as any;
      if (!q?.source) throw new Error("query.source required");
      if (q.source === "dataset"){
        const args = {
          p_dataset_id: q.datasetId,
          p_metrics: q.metrics || ["count"],
          p_dimensions: q.dimensions || [],
          p_filters: q.filters || [],
          p_date_from: q?.dateRange?.from ?? null,
          p_date_to: q?.dateRange?.to ?? null,
          p_date_field: q?.dateRange?.field ?? null,
          p_limit: q?.limit ?? 1000
        };
        const { data, error } = await supabase.rpc("aggregate_dataset", args).maybeSingle();
        if (error) throw error;
        return new Response(JSON.stringify({ ok:true, rows: (data as any)?.rows || [], sql: (data as any)?.sql || null }), { status:200, headers:{...cors,"Content-Type":"application/json"}});
      } else if (q.source === "monday"){
        const { data, error } = await supabase.rpc("aggregate_items", {
          p_board_id: q.boardId, p_metrics: q.metrics || ["items"],
          p_dimensions: q.dimensions || [], p_filters: q.filters || [],
          p_date_from: q?.dateRange?.from ?? null, p_date_to: q?.dateRange?.to ?? null,
          p_date_field: q?.dateRange?.field ?? null, p_limit: q?.limit ?? 1000
        }).maybeSingle();
        if (error) throw error;
        return new Response(JSON.stringify({ ok:true, rows: (data as any)?.rows || [], sql: (data as any)?.sql || null }), { status:200, headers:{...cors,"Content-Type":"application/json"}});
      } else {
        throw new Error("unknown source");
      }
    }

    return new Response(JSON.stringify({ ok:false, error:"Not found" }),{status:404,headers:{...cors,"Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({ ok:false, error:String(e?.message||e) }), { status:500, headers:{...cors,"Content-Type":"application/json"} });
  }
});

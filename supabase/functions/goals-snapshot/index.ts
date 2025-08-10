import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};

function periodBounds(period:"monthly"|"quarterly", d=new Date()){
  const y=d.getFullYear(); const m=d.getMonth();
  if(period==="monthly"){
    const from=new Date(y,m,1); const to=new Date(y,m+1,0);
    return {from:from.toISOString().slice(0,10), to:to.toISOString().slice(0,10)};
  }else{
    const q=Math.floor(m/3); const from=new Date(y, q*3,1); const to=new Date(y, q*3+3,0);
    return {from:from.toISOString().slice(0,10), to:to.toISOString().slice(0,10)};
  }
}

Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:H});
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{...H,"Content-Type":"application/json"}});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  try{
    const { data: goals } = await supabase.from("exec_goals").select("*").limit(200);
    const out:any[]=[];
    for(const g of (goals||[])){
      const {from,to}=periodBounds(g.period as any);
      const rpc = g.source==="dataset" ? "aggregate_dataset" : "aggregate_items";
      const args:any = (g.source==="dataset")
        ? { p_dataset_id:g.ref_id, p_board_id:null }
        : { p_dataset_id:null, p_board_id:Number(g.ref_id) };
      const { data, error } = await supabase.rpc(rpc, {
        ...args, p_metrics: [g.metric_key], p_dimensions: [],
        p_filters: [], p_date_from: from, p_date_to: to, p_date_field: g.date_field, p_limit: 1000
      }).maybeSingle();
      if(error) {
        console.log(`Error for goal ${g.id}:`, error);
        continue;
      }
      const cur = Number((data?.rows?.[0]||{})[g.metric_key] || 0);
      // תחזית ליניארית קטנטנה: קצב יומי עד היום * מספר ימי התקופה
      const daysPassed = Math.max(1, Math.floor((Date.now()-Date.parse(from))/(86400000)));
      const totalDays = Math.max(1, Math.floor((Date.parse(to)-Date.parse(from))/(86400000))+1);
      const paceForecast = (cur/daysPassed)*totalDays;
      const onTrack = paceForecast >= Number(g.target||0) * 0.98;

      out.push({ goalId:g.id, label:g.label, period:g.period, from, to, current:cur, target:Number(g.target), forecast: Math.round(paceForecast), onTrack });
      // כתיבה לקאש
      await supabase.from("exec_goal_snapshots").upsert({
        goal_id:g.id, period_start: from, period_end: to, current_value: cur, target: g.target,
        forecast: paceForecast, on_track: onTrack, computed_at: new Date().toISOString()
      }, { onConflict:"goal_id,period_start" });
    }
    return new Response(JSON.stringify({ok:true, snapshots:out}),{status:200,headers:{...H,"Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{...H,"Content-Type":"application/json"}});
  }
});
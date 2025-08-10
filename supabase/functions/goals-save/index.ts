import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};

Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:H});
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{...H,"Content-Type":"application/json"}});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  try{
    const body=await req.json();
    const upsert={ department:body.department, source:body.source, ref_id:String(body.refId),
      metric_key:body.metricKey, label:body.label, period:body.period, target:Number(body.target),
      date_field:body.dateField||"date", start_date:body.startDate||null, end_date:body.endDate||null, notify: body.notify!==false };
    let res;
    if(body.id){
      res = await supabase.from("exec_goals").update(upsert).eq("id", body.id).select("id").maybeSingle();
    }else{
      res = await supabase.from("exec_goals").insert(upsert).select("id").maybeSingle();
    }
    if(res.error) throw res.error;
    return new Response(JSON.stringify({ok:true, id: res.data?.id}),{status:200,headers:{...H,"Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{...H,"Content-Type":"application/json"}});
  }
});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const H = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, { headers: H });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ ok:false, error:"Unauthorized" }), { status:401, headers:{...H, "Content-Type":"application/json"} });

  const { key = 'global_filters', value = {} } = await req.json().catch(()=>({}));

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global:{ headers:{ Authorization: auth }}});

  try{
    const { data, error } = await supabase
      .from('user_prefs')
      .upsert({ key, value }, { onConflict: 'user_id,key' })
      .select('id, updated_at')
      .maybeSingle();
    if (error) throw error;
    return new Response(JSON.stringify({ ok:true, id: data?.id, updated_at: data?.updated_at }), { status:200, headers:{...H, "Content-Type":"application/json"} });
  }catch(e:any){
    return new Response(JSON.stringify({ ok:false, error:String(e?.message||e) }), { status:500, headers:{...H, "Content-Type":"application/json"} });
  }
});
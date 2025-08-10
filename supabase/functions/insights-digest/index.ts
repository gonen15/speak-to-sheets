import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};

Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:H});
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{...H,"Content-Type":"application/json"}});
  const key=Deno.env.get("OPENAI_API_KEY");
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  try{
    // קח KPIs וטרנדים מה-snapshot הקיים
    const snap = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/executive-snapshot`, {
      method:"POST", headers:{ "Authorization":auth, "Content-Type":"application/json" }, body: JSON.stringify({})
    }).then(r=>r.json());
    if(!snap?.ok) throw new Error(snap?.error||"snapshot failed");

    let bullets = [
      "Identify top positive/negative movements last 14–30 days.",
      "Suggest one comparison to run (e.g., client A vs B) and one drill-down (dimension).",
      "Write concise, with numbers formatted.",
      "Respond in Hebrew if content contains Hebrew, otherwise English."
    ].join(" ");

    let actions:any[] = [
      { kind:"compare", label:"השווה שני לקוחות", payload:{ dimension:"client" } },
      { kind:"drilldown", label:"פירוק לפי סטטוס", payload:{ dimension:"status" } }
    ];

    let summary = "- No LLM key configured.";
    if(key){
      const body={ model:"gpt-4o-mini", temperature:0.3, messages:[
        { role:"system", content:"You are a crisp business analyst. Keep it short: 4–6 bullets + 2 action suggestions." },
        { role:"user", content: JSON.stringify({ instruction: bullets, kpis:snap.kpis, trends:snap.trends, tops:snap.tops }) }
      ]};
      const r = await fetch("https://api.openai.com/v1/chat/completions",{ method:"POST", headers:{ "Authorization":`Bearer ${key}`, "Content-Type":"application/json" }, body: JSON.stringify(body) }).then(r=>r.json());
      summary = r.choices?.[0]?.message?.content || summary;
    }

    return new Response(JSON.stringify({ ok:true, summary, actions }),{status:200,headers:{...H,"Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{...H,"Content-Type":"application/json"}});
  }
});
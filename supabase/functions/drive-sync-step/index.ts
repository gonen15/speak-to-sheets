import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};

async function getSpreadsheetSheets(apiKey: string, spreadsheetId: string) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
  url.searchParams.set("fields","sheets.properties(sheetId,title)");
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if(!res.ok) throw new Error(`Sheets meta failed: ${res.status}`);
  const j = await res.json();
  return (j.sheets||[]).map((s:any)=>s.properties) as Array<{sheetId:number;title:string}>;
}
async function exportSheetCsv(spreadsheetId: string, gid: number) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`Export csv failed: ${res.status}`);
  return await res.text();
}
async function downloadCsvFile(fileId: string) {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`CSV download failed: ${res.status}`);
  return await res.text();
}

Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:H});
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{...H,"Content-Type":"application/json"}});
  const supa=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});

  try{
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if(!apiKey) throw new Error("Missing GOOGLE_API_KEY");

    const { jobId, batchSize=5, replace=false } = await req.json();
    if(!jobId) throw new Error("jobId required");

    const { data:job } = await supa.from("upload_jobs").select("*").eq("id", jobId).maybeSingle();
    if(!job) throw new Error("job not found");
    if(job.status==="completed" || job.status==="failed"){
      return new Response(JSON.stringify({ ok:true, job, items: [] }),{status:200,headers:{...H,"Content-Type":"application/json"}});
    }

    // הבא אצווה של פריטים בתור
    const { data:items } = await supa.from("upload_job_items")
      .select("*").eq("job_id", jobId).eq("state","queued").order("id").limit(batchSize);

    if(!items || items.length===0){
      // אין מה לעבד → סיים
      await supa.from("upload_jobs").update({ status:"completed", progress:100, finished_at:new Date().toISOString() }).eq("id", jobId);
      const { data:j2 } = await supa.from("upload_jobs").select("*").eq("id", jobId).maybeSingle();
      return new Response(JSON.stringify({ ok:true, job:j2, items: [] }),{status:200,headers:{...H,"Content-Type":"application/json"}});
    }

    const doneNow:any[]=[];
    for(const it of items){
      try{
        await supa.from("upload_job_items").update({ state:"running" }).eq("id", it.id);
        await supa.from("upload_jobs").update({ current_file: it.name }).eq("id", jobId);

        let results: Array<{name:string,csv:string,sourceUrl:string}> = [];
        if(it.mime==="application/vnd.google-apps.spreadsheet"){
          const sheets = await getSpreadsheetSheets(apiKey, it.file_id);
          for(const s of sheets){
            const csv = await exportSheetCsv(it.file_id, s.sheetId);
            results.push({
              name: `${it.name} — ${s.title}`,
              csv,
              sourceUrl: `https://docs.google.com/spreadsheets/d/${it.file_id}/edit#gid=${s.sheetId}`
            });
          }
        }else{
          const csv = await downloadCsvFile(it.file_id);
          results.push({
            name: it.name,
            csv,
            sourceUrl: `https://drive.google.com/file/d/${it.file_id}/view`
          });
        }

        // הכנסה/החלפה עם דדופ
        let lastAction = "created"; let lastDataset: string|undefined;
        for(const r of results){
          const up = await supa.rpc("dataset_upsert_from_csv", {
            p_name: r.name, p_csv: r.csv, p_source_url: r.sourceUrl, p_replace: replace
          }) as any;
          if((up as any).error) throw (up as any).error;
          const row = (up as any).data?.[0] || {};
          lastDataset = row.dataset_id; lastAction = row.action || lastAction;
        }

        await supa.from("upload_job_items").update({
          state:"done", action:lastAction, dataset_id: lastDataset, finished_at: new Date().toISOString()
        }).eq("id", it.id);

        // attach last dataset to the parent job for UI navigation
        if (lastDataset) {
          await supa.from("upload_jobs").update({ dataset_id: lastDataset }).eq("id", jobId);
        }

        doneNow.push({ id: it.id, name: it.name, state:"done", action:lastAction });
      }catch(e:any){
        await supa.from("upload_job_items").update({
          state:"error", error: String(e?.message||e), finished_at: new Date().toISOString()
        }).eq("id", it.id);
        doneNow.push({ id: it.id, name: it.name, state:"error", action:null, error:String(e?.message||e) });
      }

      // עדכן התקדמות
      const { count } = await supa.from("upload_job_items").select("*",{count:"exact",head:true}).eq("job_id", jobId).eq("state","done");
      const { count: total } = await supa.from("upload_job_items").select("*",{count:"exact",head:true}).eq("job_id", jobId);
      const progress = total ? Math.round(((count||0)/total)*100) : 100;
      await supa.from("upload_jobs").update({ done_items: count||0, total_items: total||0, progress }).eq("id", jobId);
    }

    const { data:j2 } = await supa.from("upload_jobs").select("*").eq("id", jobId).maybeSingle();
    return new Response(JSON.stringify({ ok:true, job:j2, items: doneNow }),{status:200,headers:{...H,"Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{...H,"Content-Type":"application/json"}});
  }
});
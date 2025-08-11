import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};

function parseFolderId(input?:string|null){
  if(!input) return null;
  const m = input.match(/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : input;
}

Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:H});
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{...H,"Content-Type":"application/json"}});
  const supa=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  try{
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if(!apiKey) throw new Error("Missing GOOGLE_API_KEY");

    const { folderUrl, folderId: rawId, name } = await req.json();
    const folderId = parseFolderId(rawId || folderUrl);
    if(!folderId) throw new Error("folderId or folderUrl is required");

    // 1) צור Job
    const { data:job, error:jerr } = await supa.from("upload_jobs").insert({
      source_kind: "drive_folder", name: name || `Drive ${folderId}`,
      status: "running", progress: 1
    }).select("id").maybeSingle();
    if(jerr) throw jerr;
    const jobId = job!.id as string;

    // 2) רשימת קבצים בתיקייה (Sheets/CSV בלבד)
    const base = "https://www.googleapis.com/drive/v3/files";
    const q = `'${folderId}' in parents and trashed=false and (mimeType='application/vnd.google-apps.spreadsheet' or mimeType='text/csv' or name contains '.csv')`;
    const fields = "nextPageToken,files(id,name,mimeType)";
    let pageToken:string|undefined; let total=0;

    do{
      const url = new URL(base);
      url.searchParams.set("q", q);
      url.searchParams.set("fields", fields);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("pageSize", "1000");
      if(pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString());
      if(!res.ok) throw new Error(`Drive list failed: ${res.status}`);
      const json = await res.json();
      const files = (json.files||[]) as Array<{id:string;name:string;mimeType:string}>;
      total += files.length;
      if(files.length){
        await supa.from("upload_job_items").insert(
          files.map(f=>({ job_id: jobId, file_id: f.id, name: f.name, mime: f.mimeType, state: "queued" }))
        );
      }
      pageToken = json.nextPageToken || undefined;
    }while(pageToken);

    // 3) עדכן מטרות job
    await supa.from("upload_jobs").update({ total_items: total, done_items: 0, progress: total? 2 : 100, status: total? "running":"completed" }).eq("id", jobId);

    return new Response(JSON.stringify({ ok:true, jobId, total }),{status:200,headers:{...H,"Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{...H,"Content-Type":"application/json"}});
  }
});
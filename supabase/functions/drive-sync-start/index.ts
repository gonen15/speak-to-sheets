import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const H={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

function parseFolderId(input?:string|null){ if(!input) return null; const m=input.match(/folders\/([a-zA-Z0-9_-]+)/); return m? m[1]: input; }

Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:H});
  const auth=req.headers.get("Authorization")||"";
  const supa=createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global:{ headers:{ Authorization: auth } }});

  const safeErr=(stage:string, error:any, extra:any={})=>{
    console.error("drive-sync-start", stage, error);
    return new Response(JSON.stringify({ ok:false, stage, error: String(error?.message||error), ...extra }), {
      status:200, headers:{...H,"Content-Type":"application/json"}
    });
  };

  try{
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if(!apiKey) return safeErr("env", "Missing GOOGLE_API_KEY");

    const { data:{ user } } = await supa.auth.getUser();
    if(!user) return safeErr("auth", "No user (enable Anonymous sign-ins or sign in)");

    const body = await req.json().catch(()=> ({}));
    const folderId = parseFolderId(body.folderId || body.folderUrl);
    if(!folderId) return safeErr("input", "folderId or folderUrl is required");

    // צור job
    const ins = await supa.from("upload_jobs").insert({
      source_kind:"drive_folder", name: body.name || `Drive ${folderId}`, status:"running", progress:1
    }).select("id").maybeSingle();
    if(ins.error) return safeErr("db_insert_job", ins.error);

    const jobId = ins.data!.id as string;

    // רשימת קבצים
    const base="https://www.googleapis.com/drive/v3/files";
    const q=`'${folderId}' in parents and trashed=false and (mimeType='application/vnd.google-apps.spreadsheet' or mimeType='text/csv' or name contains '.csv')`;
    const fields="nextPageToken,files(id,name,mimeType)";
    let pageToken:string|undefined; let total=0;

    do{
      const u=new URL(base);
      u.searchParams.set("q",q); u.searchParams.set("fields",fields); u.searchParams.set("key",apiKey); u.searchParams.set("pageSize","1000");
      if(pageToken) u.searchParams.set("pageToken",pageToken);
      const res=await fetch(u.toString());
      const bodyTxt=await res.text(); let j:any=null; try{ j=JSON.parse(bodyTxt);}catch{}
      if(!res.ok) return safeErr("drive_list", `status ${res.status}`, { body: (j?.error?.message || bodyTxt)?.slice(0,500) });
      const files=(j?.files||[]) as Array<{id:string;name:string;mimeType:string}>;
      total+=files.length;
      if(files.length){
        const bulk=await supa.from("upload_job_items").insert(files.map(f=>({ job_id:jobId, file_id:f.id, name:f.name, mime:f.mimeType, state:"queued" })));
        if(bulk.error) return safeErr("db_insert_items", bulk.error);
      }
      pageToken=j?.nextPageToken||undefined;
    }while(pageToken);

    await supa.from("upload_jobs").update({ total_items: total, done_items:0, progress: total?2:100, status: total? "running":"completed" }).eq("id", jobId);

    return new Response(JSON.stringify({ ok:true, jobId, total }), { status:200, headers:{...H,"Content-Type":"application/json"}});
  }catch(e:any){
    return safeErr("catch", e);
  }
});

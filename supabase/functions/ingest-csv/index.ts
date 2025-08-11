import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

async function setJob(supabase: any, jobId: string, patch: any) {
  await supabase.from("upload_jobs").update(patch).eq("id", jobId);
}

async function log(supabase: any, jobId: string, level: string, message: string, ctx: any = {}) {
  await supabase.from("upload_job_logs").insert({ job_id: jobId, level, message, ctx });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ ok: false, error: "Unauthorized" }),
      { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  try {
    const { jobId, datasetName, replace = false, sourceUrl = null } = await req.json();
    if (!jobId || !datasetName) {
      throw new Error("jobId and datasetName are required");
    }

    await setJob(supabase, jobId, { 
      status: "running", 
      started_at: new Date().toISOString(), 
      progress: 5 
    });

    // 1) Download CSV content from bucket
    const path = `incoming/${jobId}.csv`;
    const { data: file, error: downloadError } = await supabase.storage
      .from("incoming")
      .download(path);
    
    if (downloadError) throw downloadError;
    
    const csv = await file.text();
    await log(supabase, jobId, "info", "CSV downloaded", { bytes: csv.length });

    // 2) Upsert with deduplication/replacement
    await setJob(supabase, jobId, { progress: 40 });
    
    const { data: upsertResult, error: upsertError } = await supabase.rpc(
      "dataset_upsert_from_csv", 
      { 
        p_name: datasetName, 
        p_csv: csv, 
        p_source_url: sourceUrl, 
        p_replace: replace 
      }
    );
    
    if (upsertError) throw upsertError;
    
    const result = upsertResult?.[0] || {};
    const datasetId = result.dataset_id;
    const action = result.action;

    await log(supabase, jobId, "info", "Upsert result", { action, datasetId });

    // 3) Quick analysis for common errors (headers, empty rows, NaN)
    await setJob(supabase, jobId, { progress: 70 });
    
    const lines = csv.split(/\r?\n/);
    const headers = (lines[0] || "").split(",").map(s => s.trim()).filter(Boolean);
    const sample = lines.slice(1, 51);
    let badRows = 0;
    
    for (const line of sample) {
      const cols = line.split(",");
      if (cols.length !== headers.length) badRows++;
    }
    
    const stats = { 
      headers, 
      sampled: sample.length, 
      bad_rows: badRows 
    };
    
    await log(
      supabase, 
      jobId, 
      badRows ? "warn" : "info", 
      badRows ? "Some rows have different column count" : "Sample OK", 
      { badRows }
    );

    // 4) Completion
    await setJob(supabase, jobId, {
      status: "completed",
      progress: 100,
      finished_at: new Date().toISOString(),
      dataset_id: datasetId,
      action,
      stats
    });

    return new Response(
      JSON.stringify({ ok: true, datasetId, action, stats }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (e: any) {
    console.error("Ingest CSV error:", e);
    
    // Try to update job status on failure
    try {
      const url = new URL(req.url);
      const jobId = url.searchParams.get("jobId") || null;
      if (jobId) {
        await setJob(supabase, jobId, {
          status: "failed",
          progress: 100,
          error: String(e?.message || e),
          finished_at: new Date().toISOString()
        });
      }
    } catch (updateError) {
      console.error("Failed to update job status:", updateError);
    }
    
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
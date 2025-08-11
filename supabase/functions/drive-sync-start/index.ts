import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const H = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function parseFolderId(input?: string | null) {
  if (!input) return null;
  const m = input.match(/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : input;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: H });

  // 1) Require JWT
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok: false, stage: "auth", error: "Unauthorized (no JWT)" }), { status: 401, headers: { ...H, "Content-Type": "application/json" } });
  }

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  try {
    // 2) Env checks
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, stage: "env", error: "Missing GOOGLE_API_KEY secret" }), { status: 500, headers: { ...H, "Content-Type": "application/json" } });
    }

    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, stage: "auth", error: "No user on request (RLS will fail)" }), { status: 401, headers: { ...H, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const folderId = parseFolderId(body.folderId || body.folderUrl);
    if (!folderId) {
      return new Response(JSON.stringify({ ok: false, stage: "input", error: "folderId or folderUrl is required" }), { status: 400, headers: { ...H, "Content-Type": "application/json" } });
    }

    // 3) Create job
    const ins = await supa.from("upload_jobs").insert({
      source_kind: "drive_folder",
      name: body.name || `Drive ${folderId}`,
      status: "running",
      progress: 1
    }).select("id").maybeSingle();

    if (ins.error) {
      return new Response(JSON.stringify({ ok: false, stage: "db_insert_job", error: ins.error.message }), { status: 500, headers: { ...H, "Content-Type": "application/json" } });
    }
    const jobId = ins.data!.id as string;

    // 4) List files in Drive folder
    const base = "https://www.googleapis.com/drive/v3/files";
    const q = `'${folderId}' in parents and trashed=false and (mimeType='application/vnd.google-apps.spreadsheet' or mimeType='text/csv' or name contains '.csv')`;
    const fields = "nextPageToken,files(id,name,mimeType)";
    let pageToken: string | undefined;
    let total = 0;

    do {
      const url = new URL(base);
      url.searchParams.set("q", q);
      url.searchParams.set("fields", fields);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("pageSize", "1000");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return new Response(JSON.stringify({ ok: false, stage: "drive_list", status: res.status, error: `Drive list failed`, body: text.slice(0, 500) }), { status: 502, headers: { ...H, "Content-Type": "application/json" } });
      }
      const json = await res.json();
      const files = (json.files || []) as Array<{ id: string; name: string; mimeType: string }>;
      total += files.length;
      if (files.length) {
        const bulk = await supa.from("upload_job_items").insert(
          files.map(f => ({ job_id: jobId, file_id: f.id, name: f.name, mime: f.mimeType, state: "queued" }))
        );
        if (bulk.error) {
          return new Response(JSON.stringify({ ok: false, stage: "db_insert_items", error: bulk.error.message }), { status: 500, headers: { ...H, "Content-Type": "application/json" } });
        }
      }
      pageToken = json.nextPageToken || undefined;
    } while (pageToken);

    // 5) Update job with totals
    await supa.from("upload_jobs").update({
      total_items: total,
      done_items: 0,
      progress: total ? 2 : 100,
      status: total ? "running" : "completed"
    }).eq("id", jobId);

    return new Response(JSON.stringify({ ok: true, jobId, total }), { status: 200, headers: { ...H, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, stage: "catch", error: String((e as any)?.message || e) }), { status: 500, headers: { ...H, "Content-Type": "application/json" } });
  }
});

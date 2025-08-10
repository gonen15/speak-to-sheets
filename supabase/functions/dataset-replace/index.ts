import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
  const admin = createClient(SUPABASE_URL, SERVICE);

  try {
    const { datasetId, rows, columns, fileHash, sourceUrl, originalName } = await req.json();
    if (!datasetId || !Array.isArray(rows) || !Array.isArray(columns)) {
      return new Response(JSON.stringify({ ok: false, error: "datasetId, rows[], columns[] required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Load dataset and validate ownership (unless service role is used)
    const { data: ds, error: dsErr } = await admin
      .from("uploaded_datasets")
      .select("id, created_by")
      .eq("id", datasetId)
      .maybeSingle();
    if (dsErr) throw dsErr;
    if (!ds) throw new Error("Dataset not found");

    let authorized = false;
    if (token && token === SERVICE) {
      authorized = true; // scheduler/service allowed
    } else if (token) {
      const { data: u, error: uErr } = await admin.auth.getUser(token);
      if (!uErr && u?.user?.id && ds.created_by === u.user.id) authorized = true;
    }
    if (!authorized) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Replace rows (admin bypasses RLS for delete/insert)
    const { error: delErr } = await admin.from("dataset_rows").delete().eq("dataset_id", datasetId);
    if (delErr) throw delErr;

    const chunk = 1000;
    for (let i = 0; i < rows.length; i += chunk) {
      const part = rows.slice(i, i + chunk).map((r: any) => ({ dataset_id: datasetId, row: r }));
      const { error } = await admin.from("dataset_rows").insert(part);
      if (error) throw error;
    }

    const { error: upErr } = await admin
      .from("uploaded_datasets")
      .update({ columns, file_hash: fileHash ?? null, source_url: sourceUrl ?? null, original_name: originalName ?? null })
      .eq("id", datasetId);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, replaced: rows.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("dataset-replace error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

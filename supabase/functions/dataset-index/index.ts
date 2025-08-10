// Ingest CSV (from Storage path or signedUrl or raw CSV) -> uploaded_datasets + dataset_rows
// Requires: verify_jwt=true (config.toml). No service role needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.224.0/csv/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slug(s: string) {
  return s.trim().replace(/[^\w\-]+/g, "_");
}

async function fetchText(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} failed ${r.status}`);
  return await r.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  try {
    const body = await req.json();
    const name: string = body?.name || "Dataset";
    const storagePath: string | undefined = body?.storagePath; // e.g. imports/drive/xxx.csv
    const signedUrl: string | undefined = body?.signedUrl;
    const csvText: string | undefined = body?.csv;

    let csv = csvText;
    if (!csv) {
      if (signedUrl) csv = await fetchText(signedUrl);
      else if (storagePath) {
        // download from Storage
        const { data, error } = await supabase.storage.from("imports").download(storagePath);
        if (error) throw error;
        csv = await data.text();
      } else {
        return new Response(
          JSON.stringify({ ok: false, error: "Provide csv or signedUrl or storagePath" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // parse CSV
    const parsed = (await parse(csv!, { skipFirstRow: false, columns: true })) as Array<Record<string, string>>;
    if (!parsed.length) {
      return new Response(JSON.stringify({ ok: false, error: "CSV is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const columns = Object.keys(parsed[0]).map(slug);

    // normalise keys
    const rows = parsed.map((r) => {
      const obj: Record<string, string> = {};
      columns.forEach((k) => (obj[k] = (r as any)[k] ?? r[k] ?? ""));
      return obj;
    });

    // create uploaded_datasets
    const path = storagePath ?? `imports/manual/${Date.now()}-${slug(name)}.csv`;
    if (!storagePath) {
      const { error: upErr } = await supabase.storage
        .from("imports")
        .upload(path, new Blob([csv!], { type: "text/csv" }), { upsert: true, contentType: "text/csv" });
      if (upErr) throw upErr;
    }

    const { data: ds, error: insErr } = await supabase
      .from("uploaded_datasets")
      .insert({ name, storage_path: path, source_url: signedUrl ?? null, columns, row_count: rows.length })
      .select("id")
      .maybeSingle();
    if (insErr) throw insErr;

    // insert rows in chunks
    const chunk = 1000;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk).map((r) => ({ dataset_id: ds!.id, row: r }));
      const { error } = await supabase.from("dataset_rows").insert(slice);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ ok: true, datasetId: ds!.id, columns, rows: rows.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
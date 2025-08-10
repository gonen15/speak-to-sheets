import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE);

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchCsv(kind: string, ref: string) {
  if (kind === "csv-url") {
    const r = await fetch(ref);
    if (!r.ok) throw new Error(`csv ${r.status}`);
    return await r.text();
  }
  if (kind === "google-sheet") {
    const url = `https://docs.google.com/spreadsheets/d/${ref}/export?format=csv`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`sheet ${r.status}`);
    return await r.text();
  }
  // TODO: drive-folder support via existing drive-import function if needed
  return "";
}

Deno.serve(async (_req) => {
  try {
    const { data: sources, error } = await admin
      .from("sync_sources")
      .select("id, dataset_id, kind, ref, enabled")
      .eq("enabled", true)
      .limit(500);
    if (error) throw error;

    let processed = 0;
    for (const s of sources || []) {
      try {
        const csv = await fetchCsv((s as any).kind, (s as any).ref);
        if (!csv) continue;
        const hash = await sha256(csv);

        const { data: ds } = await admin
          .from("uploaded_datasets")
          .select("id, file_hash")
          .eq("id", (s as any).dataset_id)
          .maybeSingle();
        if (!ds) continue;
        if ((ds as any).file_hash === hash) {
          processed++;
          continue; // no change
        }

        const lines = csv.split(/\r?\n/).filter(Boolean);
        if (lines.length === 0) continue;
        const columns = lines[0].split(",").map((h) => h.trim());
        const rows = lines.slice(1).map((line) => {
          const vals = line.split(",");
          const obj: Record<string, any> = {};
          columns.forEach((c, i) => (obj[c] = vals[i] ?? ""));
          return obj;
        });

        // Call dataset-replace using service role
        const { error: fnErr } = await admin.functions.invoke("dataset-replace", {
          body: { datasetId: (s as any).dataset_id, rows, columns, fileHash: hash, sourceUrl: null },
          headers: { Authorization: `Bearer ${SERVICE}` },
        });
        if (fnErr) throw fnErr;
        processed++;
      } catch (e) {
        console.error("sync-hourly item error", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("sync-hourly error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500 });
  }
});

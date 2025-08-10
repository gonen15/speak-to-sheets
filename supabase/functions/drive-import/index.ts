// Google Drive/Sheets → CSV exporter (folder scan)
// Requires: GOOGLE_API_KEY (Server Secret). Folder must be shared "Anyone with the link – Viewer" for API key access.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Helpers ----------
function parseFolderId(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s; // looks like a raw ID
  const m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

async function listFolderFiles(apiKey: string, folderId: string) {
  const base = "https://www.googleapis.com/drive/v3/files";
  const q = `'${folderId}' in parents and trashed = false`;
  const fields = "nextPageToken,files(id,name,mimeType)";
  let pageToken: string | undefined;
  const out: Array<{ id: string; name: string; mimeType: string }> = [];

  do {
    const url = new URL(base);
    url.searchParams.set("q", q);
    url.searchParams.set("fields", fields);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
    const json = await res.json();
    (json.files || []).forEach((f: any) => out.push({ id: f.id, name: f.name, mimeType: f.mimeType }));
    pageToken = json.nextPageToken || undefined;
  } while (pageToken);

  return out;
}

async function getSpreadsheetSheets(apiKey: string, spreadsheetId: string) {
  const metaUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
  metaUrl.searchParams.set("fields", "sheets.properties(sheetId,title)");
  metaUrl.searchParams.set("key", apiKey);
  const res = await fetch(metaUrl.toString());
  if (!res.ok) throw new Error(`Sheets meta failed: ${res.status}`);
  const json = await res.json();
  return (json.sheets || []).map((s: any) => s.properties) as Array<{ sheetId: number; title: string }>;
}

async function exportSheetCsv(spreadsheetId: string, gid: number) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Export csv failed: ${res.status}`);
  return await res.text();
}

async function downloadCsvFile(fileId: string) {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV download failed: ${res.status}`);
  return await res.text();
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require Authorization and forward it to supabase-js client
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
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Missing GOOGLE_API_KEY" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const { folderUrl, folderId: rawId } = await req.json();
    const folderId = parseFolderId(rawId || folderUrl);
    if (!folderId) {
      return new Response(JSON.stringify({ ok: false, error: "folderId or folderUrl is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Ensure user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const files = await listFolderFiles(apiKey, folderId);

    const out: any[] = [];
    for (const f of files) {
      try {
        if (f.mimeType === "application/vnd.google-apps.spreadsheet") {
          const sheets = await getSpreadsheetSheets(apiKey, f.id);
          for (const s of sheets) {
            try {
              const csv = await exportSheetCsv(f.id, s.sheetId);
              out.push({
                id: f.id,
                name: `${f.name} — ${s.title}`,
                mimeType: f.mimeType,
                sheetTitle: s.title,
                sourceUrl: `https://docs.google.com/spreadsheets/d/${f.id}/edit#gid=${s.sheetId}`,
                csv,
              });
            } catch (e) {
              out.push({ id: f.id, name: `${f.name} — ${s.title}`, mimeType: f.mimeType, error: String(e) });
            }
          }
        } else if (f.mimeType === "text/csv" || (f.name || "").toLowerCase().endsWith(".csv")) {
          const csv = await downloadCsvFile(f.id);
          out.push({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            sourceUrl: `https://drive.google.com/file/d/${f.id}/view`,
            csv,
          });
        } else {
          continue; // skip non-CSV/Sheets
        }
      } catch (e) {
        out.push({ id: f.id, name: f.name, mimeType: f.mimeType, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, count: out.length, files: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message || "unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

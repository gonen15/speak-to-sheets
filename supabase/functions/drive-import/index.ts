// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseFolderId(input: string): string | null {
  try {
    if (!input) return null;
    if (!input.includes("/")) return input; // assume it's already an ID
    const url = new URL(input);
    // /drive/folders/{id}
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("folders");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    // open?id={id}
    const id = url.searchParams.get("id");
    if (id) return id;
    return null;
  } catch {
    return input; // best effort
  }
}

async function listFolderFiles(apiKey: string, folderId: string) {
  const listUrl = new URL("https://www.googleapis.com/drive/v3/files");
  listUrl.searchParams.set("q", `'${folderId}' in parents and trashed=false`);
  listUrl.searchParams.set("fields", "files(id,name,mimeType,modifiedTime)");
  listUrl.searchParams.set("pageSize", "1000");
  listUrl.searchParams.set("supportsAllDrives", "true");
  listUrl.searchParams.set("includeItemsFromAllDrives", "true");
  listUrl.searchParams.set("key", apiKey);
  const res = await fetch(listUrl);
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const json = await res.json();
  return (json.files || []) as Array<{ id: string; name: string; mimeType: string; modifiedTime?: string }>;
}

async function getSpreadsheetSheets(apiKey: string, spreadsheetId: string) {
  const metaUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
  metaUrl.searchParams.set("fields", "sheets.properties(sheetId,title)");
  metaUrl.searchParams.set("key", apiKey);
  const res = await fetch(metaUrl);
  if (!res.ok) throw new Error(`Sheets meta failed: ${res.status}`);
  const json = await res.json();
  const sheets = (json.sheets || []).map((s: any) => s.properties) as Array<{ sheetId: number; title: string }>;
  return sheets;
}

async function exportSheetCsv(spreadsheetId: string, gid: number) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Export csv failed: ${res.status}`);
  return await res.text();
}

async function downloadCsvFile(fileId: string) {
  // Public file download shortcut
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV download failed: ${res.status}`);
  const text = await res.text();
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Missing GOOGLE_API_KEY" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      });
    }

    const { folderUrl, folderId: rawId } = await req.json();
    const folderId = parseFolderId(rawId || folderUrl);
    if (!folderId) {
      return new Response(JSON.stringify({ ok: false, error: "folderId or folderUrl is required" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
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
          // Skip non-CSV/Sheets files
          continue;
        }
      } catch (e) {
        out.push({ id: f.id, name: f.name, mimeType: f.mimeType, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, count: out.length, files: out }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message || "unknown error" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 500,
    });
  }
});

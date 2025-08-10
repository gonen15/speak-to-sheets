// deno-lint-ignore-file no-explicit-any
// Google Drive/Sheets → CSV exporter (folder scan)
// Public function (no JWT) — requires GOOGLE_API_KEY server secret.
// Folders must be shared "Anyone with the link – Viewer".

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

async function listFolderFiles(apiKey: string, folderId: string, visited = new Set<string>()): Promise<Array<{ id: string; name: string; mimeType: string }>> {
  if (visited.has(folderId)) return [];
  visited.add(folderId);

  const base = "https://www.googleapis.com/drive/v3/files";
  const q = `'${folderId}' in parents and trashed = false`;
  const fields = "nextPageToken,files(id,name,mimeType,shortcutDetails(targetId,targetMimeType))";

  async function listOnce(params: Record<string, string>) {
    let pageToken: string | undefined;
    const out: Array<any> = [];
    do {
      const url = new URL(base);
      url.searchParams.set("q", q);
      url.searchParams.set("fields", fields);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("pageSize", "1000");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Drive list failed: ${res.status} ${text}`);
      }
      const json = await res.json();
      out.push(...(json.files || []));
      pageToken = json.nextPageToken || undefined;
    } while (pageToken);
    return out;
  }

  let files: any[] = [];
  try {
    files = await listOnce({ supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
  } catch (_e) {
    files = await listOnce({});
  }

  const results: Array<{ id: string; name: string; mimeType: string }> = [];
  for (const f of files) {
    const mime = f.mimeType as string;
    if (mime === "application/vnd.google-apps.folder") {
      const nested = await listFolderFiles(apiKey, f.id, visited);
      results.push(...nested);
      continue;
    }
    if (mime === "application/vnd.google-apps.shortcut") {
      const targetId = f.shortcutDetails?.targetId as string | undefined;
      const targetMime = f.shortcutDetails?.targetMimeType as string | undefined;
      if (targetId) {
        results.push({ id: targetId, name: f.name, mimeType: targetMime || "application/octet-stream" });
      }
      continue;
    }
    results.push({ id: f.id, name: f.name, mimeType: mime });
  }

  return results;
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

async function scrapeFolderPublic(folderId: string) {
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error(`Scrape failed: ${res.status}`);
  const html = await res.text();

  const seen = new Set<string>();
  const out: Array<{ id: string; name: string; mimeType: string }> = [];

  // Find spreadsheet links
  const reSheets = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = reSheets.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: `Sheet ${id}`, mimeType: "application/vnd.google-apps.spreadsheet" });
  }

  // Find file links (may include CSV)
  const reFiles = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\//g;
  while ((m = reFiles.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: `File ${id}`, mimeType: "text/csv" });
  }

  return out;
}

async function exportSheetCsv(apiKey: string, spreadsheetId: string, gid: number) {
  // Try Docs export per sheet (supports gid)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Docs export failed: ${res.status}`);
    return await res.text();
  } catch (_e) {
    // Fallback: Drive export (first sheet only)
    const url2 = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/export?mimeType=text/csv&key=${apiKey}`;
    const res2 = await fetch(url2);
    if (!res2.ok) throw new Error(`Drive export failed: ${res2.status}`);
    return await res2.text();
  }
}

async function downloadCsvFile(apiKey: string, fileId: string) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV download failed: ${res.status}`);
  return await res.text();
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    console.log("drive-import: start", { folderId });
    let files: Array<{ id: string; name: string; mimeType: string }>; 
    try {
      files = await listFolderFiles(apiKey, folderId);
    } catch (err) {
      console.warn("drive-import: list failed, fallback to scrape", err);
      files = [];
    }
    if (!files.length) {
      try {
        files = await scrapeFolderPublic(folderId);
      } catch (err2) {
        console.error("drive-import: scrape failed", err2);
        files = [];
      }
    }
    console.log("drive-import: files found", files.length);

    const out: any[] = [];
    for (const f of files) {
      try {
        if (f.mimeType === "application/vnd.google-apps.spreadsheet") {
          const sheets = await getSpreadsheetSheets(apiKey, f.id);
          for (const s of sheets) {
            try {
              const csv = await exportSheetCsv(apiKey, f.id, s.sheetId);
              out.push({
                id: f.id,
                name: `${f.name} — ${s.title}`,
                mimeType: f.mimeType,
                sheetTitle: s.title,
                sourceUrl: `https://docs.google.com/spreadsheets/d/${f.id}/edit#gid=${s.sheetId}`,
                csv,
              });
            } catch (e) {
              console.error("drive-import: sheet export error", f.id, s.sheetId, e);
              out.push({ id: f.id, name: `${f.name} — ${s.title}`, mimeType: f.mimeType, error: String(e) });
            }
          }
        } else if (f.mimeType === "text/csv" || (f.name || "").toLowerCase().endsWith(".csv")) {
          const csv = await downloadCsvFile(apiKey, f.id);
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
        console.error("drive-import: file error", f.id, e);
        out.push({ id: f.id, name: f.name, mimeType: f.mimeType, error: String(e) });
      }
    }

    console.log("drive-import: done", { count: out.length });
    return new Response(JSON.stringify({ ok: true, count: out.length, files: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("drive-import: fatal", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message || "unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

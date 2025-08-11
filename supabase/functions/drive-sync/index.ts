import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// === drive-import utils ===
function slugify(str: string) {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap symbols for latin characters
  const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
  const to = "aaaaeeeeiiiioooouuuunc------";
  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
}

async function getFileExtension(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      console.error(`Failed to get file extension from ${url}: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType) {
      console.warn(`Content-Type header missing from ${url}`);
      return null;
    }

    if (contentType === 'text/csv') return 'csv';
    if (contentType === 'application/json') return 'json';

    console.warn(`Unexpected Content-Type: ${contentType} from ${url}`);
    return null;
  } catch (error) {
    console.error(`Error getting file extension from ${url}:`, error);
    return null;
  }
}
// === /drive-import utils ===

async function parseFolderId(input?: string | null): Promise<string | null> {
  if (!input) return null;
  const match = input.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input;
}

async function listFolderFiles(apiKey: string, folderId: string, visited = new Set<string>()): Promise<Array<{ id: string; name: string; mimeType: string }>> {
  if (visited.has(folderId)) return [];
  visited.add(folderId);

  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,shortcutDetails)&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Drive API error: ${resp.status}`);
  
  const data = await resp.json();
  let files = data.files || [];
  
  for (const file of [...files]) {
    if (file.mimeType === 'application/vnd.google-apps.shortcut') {
      if (file.shortcutDetails?.targetMimeType === 'application/vnd.google-apps.folder') {
        const subFiles = await listFolderFiles(apiKey, file.shortcutDetails.targetId, visited);
        files.push(...subFiles);
      }
    } else if (file.mimeType === 'application/vnd.google-apps.folder') {
      const subFiles = await listFolderFiles(apiKey, file.id, visited);
      files.push(...subFiles);
    }
  }
  
  return files.filter(f => 
    f.mimeType === 'application/vnd.google-apps.spreadsheet' || 
    f.mimeType === 'text/csv'
  );
}

async function getSpreadsheetSheets(apiKey: string, spreadsheetId: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Sheets API error: ${resp.status}`);
  
  const data = await resp.json();
  return (data.sheets || []).map((s: any) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title
  }));
}

async function exportSheetCsv(apiKey: string, spreadsheetId: string, gid: number): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Export error: ${resp.status}`);
  return await resp.text();
}

async function downloadCsvFile(apiKey: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download error: ${resp.status}`);
  return await resp.text();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } }
  );

  try {
    const body = await req.json();
    const { sourceId } = body;

    if (!sourceId) {
      throw new Error('Missing required field: sourceId');
    }

    // Get source config
    const { data: source, error: sourceError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      throw new Error('Source not found');
    }

    if (source.kind !== 'drive_folder') {
      throw new Error('Only drive_folder sources can be synced');
    }

    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const { folderId, folderUrl } = source.config;
    const parsedFolderId = await parseFolderId(folderId || folderUrl);
    
    if (!parsedFolderId) {
      throw new Error('Invalid folder configuration');
    }

    console.log('drive-sync: start', { sourceId, folderId: parsedFolderId });

    // List files
    const files = await listFolderFiles(apiKey, parsedFolderId);
    console.log('drive-sync: files found', files.length);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const file of files) {
      try {
        if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
          const sheets = await getSpreadsheetSheets(apiKey, file.id);
          for (const sheet of sheets) {
            const csv = await exportSheetCsv(apiKey, file.id, sheet.sheetId);
            const name = sheets.length > 1 ? `${file.name} - ${sheet.title}` : file.name;
            const sourceUrl = `https://docs.google.com/spreadsheets/d/${file.id}`;

            // Use dataset_upsert_from_csv with p_replace=false
            const { data: upsertResult, error: upsertError } = await supabase
              .rpc('dataset_upsert_from_csv', {
                p_name: name,
                p_csv: csv,
                p_source_url: sourceUrl,
                p_replace: false
              });

            if (upsertError) throw upsertError;

            const action = upsertResult?.[0]?.action;
            const datasetId = upsertResult?.[0]?.dataset_id;

            if (action === 'created') {
              imported++;
              // Link to source
              await supabase
                .from('data_source_datasets')
                .upsert({ source_id: sourceId, dataset_id: datasetId })
                .select();
            } else if (action === 'replaced') {
              updated++;
            } else {
              skipped++;
            }
          }
        } else if (file.mimeType === 'text/csv') {
          const csv = await downloadCsvFile(apiKey, file.id);
          const sourceUrl = `https://drive.google.com/file/d/${file.id}`;

          const { data: upsertResult, error: upsertError } = await supabase
            .rpc('dataset_upsert_from_csv', {
              p_name: file.name,
              p_csv: csv,
              p_source_url: sourceUrl,
              p_replace: false
            });

          if (upsertError) throw upsertError;

          const action = upsertResult?.[0]?.action;
          const datasetId = upsertResult?.[0]?.dataset_id;

          if (action === 'created') {
            imported++;
            await supabase
              .from('data_source_datasets')
              .upsert({ source_id: sourceId, dataset_id: datasetId })
              .select();
          } else if (action === 'replaced') {
            updated++;
          } else {
            skipped++;
          }
        }
      } catch (fileError) {
        console.error('drive-sync: file error', file.name, fileError);
        skipped++;
      }
    }

    // Update last_synced_at
    await supabase
      .from('data_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', sourceId);

    console.log('drive-sync: done', { imported, updated, skipped });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        imported, 
        updated, 
        skipped,
        total: files.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('drive-sync error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

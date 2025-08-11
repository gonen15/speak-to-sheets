import { supabase } from "@/lib/supabaseClient"; // משתמש ב-client הקיים שלך

export type EdgeName = "model-save" | "model-get" | "query-aggregate" | "sheet-fetch" | "drive-import" | "dataset-index" | "insights-generate" | "nl-query" | "model-auto" | "dashboard" | "dataset-replace" | "ai-chat" | "executive-snapshot" | "filters-save" | "filters-get" | "aggregate-run" | "goals-save" | "goals-snapshot" | "insights-digest" | "library-save" | "library-delete" | "drive-sync" | "upload-start" | "ingest-csv" | "drive-sync-start" | "drive-sync-step" | "ai-map";

export interface CallEdgeOptions {
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export async function callEdge<T = any>(
  name: EdgeName,
  opts?: CallEdgeOptions
): Promise<T> {
  // Ensure we have a user session (anonymous if needed)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    try {
      await supabase.auth.signInAnonymously();
    } catch (e) {
      // continue — the detailed error catcher below will report missing anon config
    }
  }

  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: opts?.body ?? {},
    headers: opts?.headers,
  });
  if (error) {
    // Try to extract function response body for more context
    const ctx = (error as any)?.context;
    let details = "";
    try {
      const text = await ctx?.response?.text?.();
      if (text) details = ` — ${text.substring(0, 800)}`;
    } catch {}
    throw new Error(`${name} failed: ${error.message || "unknown"}${details}`);
  }
  return data as T;
}

// ---------- Types ----------
export type MetricDef = {
  key: string;
  label: string;
  sql: string;
  format?: "number" | "currency" | "percent";
};

export type AggregateFilter = {
  field: string;
  op: "=" | "!=" | "in" | "between" | "like";
  value: any;
};

// ---------- Convenience helpers ----------
export function saveSemanticModel(payload: {
  boardId: number;
  name: string;
  dateColumn?: string;
  dimensions?: string[];
  metrics?: MetricDef[];
  glossary?: Record<string, string>;
}) {
  return callEdge<{ ok: boolean; model: any }>("model-save", { body: payload });
}

export function getSemanticModel(boardId: number) {
  return callEdge<{ ok: boolean; model: any }>("model-get", {
    body: { boardId },
  });
}

export function queryAggregate(payload: {
  boardId: number;
  metrics: string[];
  dimensions?: string[];
  filters?: AggregateFilter[];
  dateRange?: { field?: string; from?: string; to?: string };
  limit?: number;
}) {
  return callEdge<{ ok: boolean; rows: any[]; sql: string }>("query-aggregate", {
    body: payload,
  });
}

export function driveImport(payload: { folderUrl?: string; folderId?: string }) {
  return callEdge<{
    ok: boolean;
    count: number;
    files: { id: string; name: string; mimeType: string; sourceUrl?: string; csv?: string; error?: string }[];
  }>("drive-import", {
    body: payload,
  });
}

export function datasetIndex(payload: { name: string; storagePath?: string; signedUrl?: string; csv?: string }) {
  return callEdge<{ ok: boolean; datasetId: string; columns: string[]; rows: number }>("dataset-index", { body: payload });
}

export function aggregateDataset(payload: {
  datasetId: string;
  metrics: string[];
  dimensions?: string[];
  filters?: Array<{ field: string; op: "=" | "!=" | "in" | "like"; value: any }>;
  dateRange?: { field?: string; from?: string; to?: string };
  limit?: number;
}) {
  const body = {
    p_dataset_id: payload.datasetId,
    p_metrics: payload.metrics,
    p_dimensions: payload.dimensions ?? [],
    p_filters: payload.filters ?? [],
    p_date_from: payload?.dateRange?.from ?? null,
    p_date_to: payload?.dateRange?.to ?? null,
    p_date_field: payload?.dateRange?.field ?? null,
    p_limit: payload?.limit ?? 1000,
  };
  // Call RPC directly
  return supabase.rpc("aggregate_dataset", body).maybeSingle();
}

export function generateInsights(payload: { datasetId: string; sampleSize?: number }) {
  return callEdge<{ ok: boolean; count: number; insights: any[] }>("insights-generate", { body: payload });
}

export function nlQuery(payload: { datasetId: string; question: string }) {
  return callEdge<{ ok:boolean; plan:any; rows:any[]; sql:string; answer:string }>("nl-query", { body: payload });
}

export function autoModel(payload: { source: "dataset"; datasetId: string } | { source: "monday"; boardId: number }) {
  return callEdge<{ ok: boolean; model: any }>("model-auto", { body: payload });
}

export function saveDashboard(payload: { dashboard: any; widgets: any[] }) {
  return callEdge<{ ok: boolean; dashboard: any }>("dashboard", { body: { action: "save", ...payload } });
}

export function getDashboard(id: string) {
  return callEdge<{ ok: boolean; dashboard: any; widgets: any[] }>("dashboard", { body: { action: "get", id } });
}

export function runWidget(query: any) {
  return callEdge<{ ok: boolean; rows: any[]; sql: string }>("dashboard", { body: { action: "run", query } });
}

export function aiChat(payload: { messages: Array<{ role: "user" | "assistant" | "system"; content: string }>; datasetId?: string }) {
  return callEdge<{ ok: boolean; content: string; rows: any[]; sql?: string }>("ai-chat", { body: payload });
}

export function datasetReplace(payload: { datasetId: string; rows: any[]; columns: string[]; fileHash?: string; sourceUrl?: string; originalName?: string }) {
  return callEdge<{ ok: boolean; replaced: number }>("dataset-replace", { body: payload });
}

// Stage 5 helpers
export function filtersSave(payload: { key: string; value: any }) {
  return callEdge<{ ok: boolean; id?: string; updated_at?: string }>("filters-save", { body: payload });
}

export function filtersGet(key = 'global_filters') {
  return callEdge<{ ok: boolean; value: any }>("filters-get", { body: { key } });
}

export function aggregateRun(payload: { source:'dataset'|'monday'|'master'; refId:string|null; metrics:string[]; dimensions?:string[]; filters?:AggregateFilter[]; dateRange?:{field?:string|null; from?:string|null; to?:string|null}; limit?:number }){
  return callEdge<{ ok:boolean; rows:any[]; sql?:string; cached?:boolean }>("aggregate-run", { body: payload });
}

// Stage 8 helpers
export function goalsSave(payload:{
  id?: string; department:"sales"|"finance"|"marketing";
  source:"dataset"|"monday"; refId:string|number;
  metricKey:string; label:string; period:"monthly"|"quarterly";
  target:number; dateField?:string; startDate?:string; endDate?:string; notify?:boolean;
}) { return callEdge<{ok:boolean; id:string}>("goals-save",{ body: payload }); }

export function goalsSnapshot(){
  return callEdge<{ok:boolean; snapshots:Array<{goalId:string;label:string;period:string;from:string;to:string;current:number;target:number;forecast:number;onTrack:boolean}>}>("goals-snapshot",{ body:{} });
}

export function insightsDigest(){
  return callEdge<{ok:boolean; summary:string; actions:Array<{kind:string;label:string;payload:any}>}>("insights-digest",{ body:{} });
}

export function librarySave(payload: {
  kind: "drive_folder" | "csv_url" | "upload";
  name: string;
  config: any;
  syncEnabled?: boolean;
  syncIntervalMins?: number;
}) {
  return callEdge<{ ok: boolean; sourceId: string }>("library-save", { body: payload });
}

export function libraryDelete(payload: {
  sourceId: string;
  deleteDatasets?: boolean;
}) {
  return callEdge<{ ok: boolean }>("library-delete", { body: payload });
}

export function driveSync(payload: {
  sourceId: string;
}) {
  return callEdge<{ ok: boolean; imported: number; updated: number; skipped: number; total: number }>("drive-sync", { body: payload });
}

export function uploadStart(payload: {
  sourceKind: string;
  name: string;
  sizeBytes?: number;
  mime?: string;
  sourceRef?: string;
}) {
  return callEdge<{ ok: boolean; jobId?: string; error?: string }>("upload-start", { body: payload });
}

export function ingestCsv(payload: {
  jobId: string;
  datasetName: string;
  replace?: boolean;
  sourceUrl?: string;
}) {
  return callEdge<{ ok: boolean; datasetId?: string; action?: string; stats?: any; error?: string }>("ingest-csv", { body: payload });
}

export function driveSyncStart(payload: {
  folderUrl?: string;
  folderId?: string;
  name?: string;
}) {
  return callEdge<{ ok: boolean; jobId: string; total: number }>("drive-sync-start", { body: payload });
}

export function driveSyncStep(payload: { jobId: string; batchSize?: number; replace?: boolean }) {
  return callEdge<{ ok: boolean; job: any; items: Array<{ id: number; name: string; state: string; action?: string; error?: string }> }>(
    "drive-sync-step",
    { body: payload }
  );
}

export function aiMap(payload: { datasetId: string }) {
  return callEdge<{ ok: boolean; mapped: number }>("ai-map", { body: payload });
}
import { supabase } from "@/lib/supabaseClient"; // משתמש ב-client הקיים שלך

export type EdgeName = "model-save" | "model-get" | "query-aggregate" | "sheet-fetch" | "drive-import" | "dataset-index" | "insights-generate" | "nl-query" | "model-auto" | "dashboard" | "dataset-replace" | "ai-chat" | "executive-snapshot";

export interface CallEdgeOptions {
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export async function callEdge<T = any>(
  name: EdgeName,
  opts?: CallEdgeOptions
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: opts?.body ?? {},
    headers: opts?.headers,
  });
  if (error) {
    throw new Error(`${name} failed: ${error.message ?? "unknown error"}`);
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

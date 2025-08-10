import { supabase } from "@/lib/supabaseClient"; // משתמש ב-client הקיים שלך

export type EdgeName = "model-save" | "model-get" | "query-aggregate";

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

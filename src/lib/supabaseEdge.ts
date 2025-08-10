import { supabase } from "@/integrations/supabase/client";

export type EdgeName = "model-save" | "model-get" | "query-aggregate";

export type CallEdgeOptions = {
  // We standardize on POST via supabase.functions.invoke
  // Pass any inputs here; for model-get include { boardId }
  body?: any;
};

export async function callEdge<T = any>(name: EdgeName, opts?: CallEdgeOptions): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: opts?.body ?? {},
  });
  if (error) {
    // supabase error objects include message/status
    throw new Error(error.message || `Edge ${name} failed`);
  }
  return data as T;
}

// Convenience helpers (optional)
export async function saveSemanticModel(payload: {
  boardId: number;
  name: string;
  dateColumn?: string;
  dimensions?: string[];
  metrics?: Array<{ key: string; label: string; sql: string; format?: "number" | "currency" | "percent" }>;
  glossary?: Record<string, string>;
}) {
  return callEdge("model-save", { body: payload });
}

export async function getSemanticModel(boardId: number) {
  return callEdge("model-get", { body: { boardId } });
}

export async function queryAggregate(payload: {
  boardId: number;
  metrics: string[];
  dimensions?: string[];
  filters?: Array<{ field: string; op: "=" | "!=" | "in" | "between" | "like"; value: any }>;
  dateRange?: { field?: string; from?: string; to?: string };
  limit?: number;
}) {
  return callEdge("query-aggregate", { body: payload });
}

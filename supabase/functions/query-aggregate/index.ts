// Supabase Edge Function: query-aggregate
// Executes aggregation based on semantic model using DB function aggregate_items
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://vdsryddwzhcnoksamkep.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// Supabase client is created per-request to forward the caller's Authorization header

interface Filter { field: string; op: '='|'!='|'in'|'between'|'like'; value: any }
interface Body {
  boardId: number;
  metrics: string[];
  dimensions?: string[];
  filters?: Filter[];
  dateRange?: { field?: string; from?: string; to?: string };
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } });
    const body = (await req.json()) as Body;
    if (!body?.boardId || !body?.metrics?.length) {
      return new Response(JSON.stringify({ error: "boardId and metrics are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await supabase.rpc("aggregate_items", {
      p_board_id: body.boardId,
      p_metrics: body.metrics,
      p_dimensions: body.dimensions ?? [],
      p_filters: body.filters ?? [],
      p_date_from: body.dateRange?.from ?? null,
      p_date_to: body.dateRange?.to ?? null,
      p_date_field: body.dateRange?.field ?? null,
      p_limit: body.limit ?? 1000,
    }).maybeSingle();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, rows: (data?.rows ?? []), sql: data?.sql ?? null }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
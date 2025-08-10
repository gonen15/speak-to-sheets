// Supabase Edge Function: model-save
// Upserts a semantic model per board_id
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://vdsryddwzhcnoksamkep.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// Supabase client is created per-request to forward the caller's Authorization header

type Metric = { key: string; label: string; sql: string; format?: "number"|"currency"|"percent" };

interface SaveBody {
  boardId: number;
  name: string;
  dateColumn?: string;
  dimensions?: string[];
  metrics?: Metric[];
  glossary?: Record<string,string>;
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

    const body = (await req.json()) as SaveBody;
    if (!body?.boardId || !body?.name) {
      return new Response(JSON.stringify({ error: "boardId and name are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = {
      board_id: body.boardId,
      name: body.name,
      date_column: body.dateColumn ?? null,
      dimensions: body.dimensions ?? [],
      metrics: body.metrics ?? [],
      glossary: body.glossary ?? {},
    };

    const { data, error } = await supabase
      .from("semantic_models")
      .upsert(payload, { onConflict: "board_id" })
      .select()
      .maybeSingle();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, model: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
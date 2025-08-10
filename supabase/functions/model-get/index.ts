// Supabase Edge Function: model-get
// Returns semantic model by boardId
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://vdsryddwzhcnoksamkep.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// Supabase client is created per-request to forward the caller's Authorization header

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } });
    const url = new URL(req.url);
    const boardIdStr = url.searchParams.get("boardId");
    let boardId: number | null = boardIdStr ? Number(boardIdStr) : null;
    if (!boardId && req.method !== "GET") {
      const body = await req.json().catch(() => ({}));
      boardId = Number(body?.boardId);
    }
    if (!boardId || Number.isNaN(boardId)) {
      return new Response(JSON.stringify({ error: "boardId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await supabase.from("semantic_models").select("*").eq("board_id", boardId).maybeSingle();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, model: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildExportUrl(sheetId: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetId, gid } = await req.json();
    if (!sheetId || !gid) {
      return new Response(JSON.stringify({ ok: false, error: "sheetId and gid are required" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      });
    }

    const url = buildExportUrl(sheetId, gid);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return new Response(JSON.stringify({ ok: false, error: `Fetch failed: ${res.status}`, detail: text }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 502,
      });
    }
    const csv = await res.text();

    return new Response(JSON.stringify({ ok: true, csv }), {
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

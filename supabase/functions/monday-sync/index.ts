// Supabase Edge Function: monday-sync
// Fetches Monday.com boards and items and upserts into public.monday_* tables
// Uses MONDAY_API_TOKEN and SUPABASE_SERVICE_ROLE_KEY from project secrets

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvokePayload {
  boardIds?: number[];
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://vdsryddwzhcnoksamkep.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MONDAY_TOKEN = Deno.env.get("MONDAY_API_TOKEN");

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY secret");
}
if (!MONDAY_TOKEN) {
  console.error("Missing MONDAY_API_TOKEN secret");
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });

async function log(status: string, message: string, meta?: Record<string, unknown>) {
  try {
    await supabaseAdmin.from("monday_sync_logs").insert({ status, message, meta });
  } catch (e) {
    console.error("Failed to write log:", e);
  }
}

async function mondayGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: MONDAY_TOKEN ? MONDAY_TOKEN : "",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Monday API error: ${res.status} ${text}`);
  }
  const json = await res.json();
  if ((json.errors?.length ?? 0) > 0) {
    throw new Error(`Monday GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

async function listBoards(boardIds?: number[]): Promise<Array<{ id: number; name: string; state?: string; workspace?: string }>> {
  const q = /* GraphQL */ `
    query Boards($ids: [Int!]) {
      boards(ids: $ids) {
        id
        name
        state
        workspace { name }
      }
    }
  `;
  const data = await mondayGraphQL<{ boards: Array<{ id: number; name: string; state?: string; workspace?: { name?: string } }> }>(q, { ids: boardIds && boardIds.length ? boardIds : null });
  return (data.boards || []).map(b => ({ id: b.id, name: b.name, state: b.state, workspace: b.workspace?.name }));
}

async function upsertBoards(boards: Array<{ id: number; name: string; state?: string; workspace?: string }>) {
  if (!boards.length) return;
  const { error } = await supabaseAdmin.from("monday_boards").upsert(
    boards.map(b => ({ id: b.id, name: b.name, state: b.state ?? null, workspace: b.workspace ?? null })),
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function fetchAndUpsertItems(boardId: number): Promise<number> {
  let cursor: string | null | undefined = null;
  let count = 0;
  const q = /* GraphQL */ `
    query Items($bid: [Int!], $cursor: String) {
      boards(ids: $bid) {
        items_page(limit: 100, cursor: $cursor) {
          cursor
          items {
            id
            name
            created_at
            updated_at
            group { id }
            column_values { id text type value }
          }
        }
      }
    }
  `;
  while (true) {
    const data = await mondayGraphQL<{
      boards: Array<{
        items_page: { cursor?: string | null; items: Array<{ id: number; name: string; created_at?: string; updated_at?: string; group?: { id?: string }; column_values?: any[] }> };
      }>;
    }>(q, { bid: [boardId], cursor });

    const page = data.boards?.[0]?.items_page;
    const items = page?.items ?? [];

    if (items.length) {
      const upserts = items.map((it) => ({
        id: it.id,
        board_id: boardId,
        name: it.name ?? null,
        group_id: it.group?.id ?? null,
        monday_created_at: it.created_at ? new Date(it.created_at).toISOString() : null,
        monday_updated_at: it.updated_at ? new Date(it.updated_at).toISOString() : null,
        column_values: it.column_values ?? null,
      }));
      const { error } = await supabaseAdmin.from("monday_items").upsert(upserts, { onConflict: "id" });
      if (error) throw error;
      count += items.length;
    }

    cursor = page?.cursor ?? null;
    if (!cursor) break;
  }
  return count;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SERVICE_ROLE_KEY || !MONDAY_TOKEN) {
      await log("error", "Missing secrets", { hasServiceRole: !!SERVICE_ROLE_KEY, hasMonday: !!MONDAY_TOKEN });
      return new Response(JSON.stringify({ ok: false, error: "Missing required secrets" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = (await req.json().catch(() => ({}))) as InvokePayload;
    await log("started", "Manual sync invoked", { payload });

    const boards = await listBoards(payload.boardIds);
    await upsertBoards(boards);

    let totalItems = 0;
    for (const b of boards) {
      const c = await fetchAndUpsertItems(b.id);
      totalItems += c;
    }

    await log("completed", "Sync finished", { boards: boards.length, items: totalItems });

    return new Response(JSON.stringify({ ok: true, boards: boards.length, items: totalItems }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    await log("error", (err as Error).message);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

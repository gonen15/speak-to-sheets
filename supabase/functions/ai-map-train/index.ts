import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const H={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"
};

function sysPrompt(){
  return `You are a data mapping assistant. Map CSV column names to canonical targets:
Targets = [date, amount, customer, status, department]
Return a JSON array of {column_name, target, confidence} with confidence [0..1]. Prefer HE/EN synonyms and pick the best for each target.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: H });

  const auth = req.headers.get('Authorization') || '';
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } }
  );

  try {
    const { datasetId } = await req.json();
    if (!datasetId) {
      return new Response(JSON.stringify({ ok:false, stage:'validate', error:'datasetId required' }), { status:200, headers:{...H,'Content-Type':'application/json'} });
    }

    // Auth check
    const { data:{ user } } = await supa.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok:false, stage:'auth', error:'Unauthorized' }), { status:200, headers:{...H,'Content-Type':'application/json'} });
    }

    // Try to fetch catalog columns; fallback to sampling dataset_rows
    let { data: cat } = await supa.from('data_catalog').select('columns').eq('dataset_id', datasetId).maybeSingle();
    if (!cat) {
      const { data: sample } = await supa.from('dataset_rows').select('row').eq('dataset_id', datasetId).limit(100);
      const columns = sample?.[0]?.row ? Object.keys(sample[0].row).map(k=>({ name:k })) : [];
      cat = { columns } as any;
    }
    const cols: string[] = (cat?.columns || []).map((c:any)=> c.name || c);

    // OpenAI call
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ ok:false, stage:'config', error:'Missing OPENAI_API_KEY' }), { status:200, headers:{...H,'Content-Type':'application/json'} });
    }

    const prompt = `Columns: ${cols.join(', ')}`;
    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role:'system', content: sysPrompt() },
          { role:'user', content: prompt }
        ],
        temperature: 0.1
      })
    });

    const aiJson = await aiResp.json();
    const raw = aiJson?.choices?.[0]?.message?.content || '[]';
    let arr: any[] = [];
    try { arr = JSON.parse(raw); } catch {}

    // Fallback heuristic if empty
    if (!Array.isArray(arr) || arr.length === 0) {
      const heuristics: Record<string,string> = {
        date: 'date', amount: 'amount', customer:'customer', status:'status', department:'department'
      };
      arr = Object.entries(heuristics).map(([target, key])=>{
        const found = cols.find(c => c.toLowerCase() === key);
        return found ? { column_name: found, target, confidence: 0.6 } : null;
      }).filter(Boolean) as any[];
    }

    // Persist
    const rows = arr
      .filter(x => x?.column_name && x?.target)
      .map((x:any) => ({
        dataset_id: datasetId,
        column_name: String(x.column_name),
        target: String(x.target),
        confidence: Number(x.confidence ?? 0)
      }));

    await supa.from('ai_column_mappings').delete().eq('dataset_id', datasetId);
    if (rows.length) await supa.from('ai_column_mappings').insert(rows);

    return new Response(JSON.stringify({ ok:true, trained: rows.length }), { status:200, headers:{...H,'Content-Type':'application/json'} });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, stage:'runtime', error:String(e?.message||e) }), { status:200, headers:{...H,'Content-Type':'application/json'} });
  }
});

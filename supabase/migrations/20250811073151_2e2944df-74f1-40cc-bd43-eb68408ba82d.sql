-- 1) Catalog schemas
create table if not exists public.data_catalog (
  dataset_id uuid primary key references public.uploaded_datasets(id) on delete cascade,
  columns jsonb not null default '[]'::jsonb,          -- [{name,type,sample,unique_pct,null_pct}]
  updated_at timestamptz default now()
);

alter table public.data_catalog enable row level security;
drop policy if exists dc_owner on public.data_catalog;
create policy dc_owner on public.data_catalog
for all to authenticated
using (
  exists(
    select 1 from public.uploaded_datasets d 
    where d.id = data_catalog.dataset_id and d.created_by = auth.uid()
  )
)
with check (
  exists(
    select 1 from public.uploaded_datasets d 
    where d.id = data_catalog.dataset_id and d.created_by = auth.uid()
  )
);

-- 2) AI mappings: source column -> canonical target
create table if not exists public.ai_column_mappings (
  dataset_id uuid references public.uploaded_datasets(id) on delete cascade,
  column_name text not null,
  target text not null,              -- 'date'|'amount'|'customer'|'status'|'department'|...
  confidence numeric not null default 0.0,
  primary key (dataset_id, column_name)
);

alter table public.ai_column_mappings enable row level security;
drop policy if exists map_owner on public.ai_column_mappings;
create policy map_owner on public.ai_column_mappings
for all to authenticated
using (
  exists(
    select 1 from public.uploaded_datasets d 
    where d.id = ai_column_mappings.dataset_id and d.created_by = auth.uid()
  )
)
with check (
  exists(
    select 1 from public.uploaded_datasets d 
    where d.id = ai_column_mappings.dataset_id and d.created_by = auth.uid()
  )
);

-- 3) Helper function: get mapped value by target
create or replace function public.master_get(p_row jsonb, p_dataset uuid, p_target text)
returns text language sql stable as $$
  select p_row ->> (
    select m.column_name
    from public.ai_column_mappings m
    where m.dataset_id = p_dataset and m.target = p_target
    order by confidence desc
    limit 1
  );
$$;

-- 4) Unified master view for dashboards
create or replace view public.master_flat as
select
  d.id as dataset_id,
  d.original_name as source_name,
  (public.master_get(r.row, d.id, 'date'))::date      as date,
  (public.master_get(r.row, d.id, 'amount'))::numeric as amount,
  public.master_get(r.row, d.id, 'customer')          as customer,
  public.master_get(r.row, d.id, 'status')            as status,
  public.master_get(r.row, d.id, 'department')        as department,
  r.row                                               as raw_row
from public.dataset_rows r
join public.uploaded_datasets d on d.id = r.dataset_id
where coalesce(d.is_revoked, false) = false;

-- 5) RPC aggregation for master
create or replace function public.aggregate_master(
  p_metrics text[],
  p_dimensions text[] default '{}',
  p_filters jsonb default '[]',
  p_date_from date default null,
  p_date_to date default null,
  p_limit int default 1000
) returns table(rows jsonb, sql text)
language plpgsql as $$
declare
  sel text := '';
  grp text := '';
  wh  text := 'where 1=1';
  i int;
  m text;
  d text;
  dyn_sql text;
  v_rows jsonb;
begin
  -- metrics
  if array_length(p_metrics,1) is null then
    raise exception 'metrics required';
  end if;
  for i in 1..array_length(p_metrics,1) loop
    m := p_metrics[i];
    if m = 'amount_total' then sel := sel || 'sum(coalesce(amount,0)) as amount_total,';
    elsif m = 'rows' then      sel := sel || 'count(*) as rows,';
    elsif m = 'customers' then sel := sel || 'count(distinct customer) as customers,';
    else sel := sel || format('null::text as %I,', m);
    end if;
  end loop;

  -- dimensions
  if array_length(p_dimensions,1) is not null then
    for i in 1..array_length(p_dimensions,1) loop
      d := p_dimensions[i];
      grp := grp || format('%I,', d);
      sel := sel || format('%I,', d);
    end loop;
  end if;
  if sel <> '' then sel := left(sel, length(sel)-1); end if;
  if grp <> '' then grp := ' group by ' || left(grp, length(grp)-1); end if;

  -- date filters
  if p_date_from is not null then wh := wh || format(' and date >= %L', p_date_from); end if;
  if p_date_to   is not null then wh := wh || format(' and date <= %L', p_date_to); end if;

  -- basic filters (equals/!=/like)
  if p_filters is not null and p_filters <> '[]'::jsonb then
    wh := wh || (
      select string_agg(
        format(' and %I %s %s',
          (f->>'field')::text,
          case when f->>'op' in ('=','!=','like') then f->>'op' else '=' end,
          case when f->>'op'='like' then quote_literal('%' || (f->>'value') || '%')
               when jsonb_typeof(f->'value')='string' then quote_literal(f->>'value')
               else (f->>'value') end
        ), ''
      )
      from jsonb_array_elements(p_filters) f
    );
  end if;

  dyn_sql := format('select %s from public.master_flat %s %s limit %s', sel, wh, grp, p_limit);

  -- execute and aggregate into jsonb
  execute 'select coalesce(jsonb_agg(t.*), ''[]''::jsonb) from (' || dyn_sql || ') t' into v_rows;

  return query select v_rows as rows, dyn_sql as sql;
end $$;
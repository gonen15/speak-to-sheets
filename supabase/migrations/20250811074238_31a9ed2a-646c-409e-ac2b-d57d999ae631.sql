-- 1) Harden aggregate_items to enforce board ownership
create or replace function public.aggregate_items(
  p_board_id bigint,
  p_metrics text[],
  p_dimensions text[],
  p_filters jsonb default '[]'::jsonb,
  p_date_from date default null::date,
  p_date_to date default null::date,
  p_date_field text default 'date'::text,
  p_limit integer default 1000
) returns table(rows jsonb[], sql text)
language plpgsql
set search_path to 'public'
as $function$
declare
  v_model record;
  v_select_cols text = '';
  v_group_by text = '';
  v_where text = 'board_id = ' || p_board_id;
  v_metric_map jsonb;
  v_metric_sql text;
  v_metric_key text;
  v_dim text;
  v_idx int = 1;
  v_sql text;
  v_allowed_date_cols text[] := array['date','date_to','created_at','updated_at'];
  v_rows jsonb[];
begin
  -- Enforce ownership of the board to prevent cross-tenant access
  if not exists (
    select 1 from public.monday_boards b
    where b.id = p_board_id and b.created_by = auth.uid()
  ) then
    raise exception 'Access denied for board_id %', p_board_id;
  end if;

  -- Load model (will also respect RLS on semantic_models)
  select * into v_model from public.semantic_models where board_id = p_board_id limit 1;
  if not found then
    raise exception 'No semantic model found for board_id %', p_board_id;
  end if;

  v_metric_map := v_model.metrics;

  if p_dimensions is not null and array_length(p_dimensions,1) > 0 then
    for v_idx in 1..array_length(p_dimensions,1) loop
      v_dim := p_dimensions[v_idx];
      v_select_cols := v_select_cols || case when v_select_cols = '' then '' else ', ' end || format('%I', v_dim);
      v_group_by := v_group_by || case when v_group_by = '' then '' else ', ' end || format('%I', v_dim);
    end loop;
  end if;

  if p_metrics is null or array_length(p_metrics,1) = 0 then
    raise exception 'At least one metric is required';
  end if;

  for v_idx in 1..array_length(p_metrics,1) loop
    v_metric_key := p_metrics[v_idx];
    v_metric_sql := (select (m->>'sql') from jsonb_array_elements(v_metric_map) m where m->>'key' = v_metric_key);
    if v_metric_sql is null then
      raise exception 'Metric % not found in model', v_metric_key;
    end if;
    v_select_cols := v_select_cols || case when v_select_cols = '' then '' else ', ' end || format('(%s) as %I', v_metric_sql, v_metric_key);
  end loop;

  if p_date_field is null or not (p_date_field = any(v_allowed_date_cols)) then
    p_date_field := 'date';
  end if;
  if p_date_from is not null then
    v_where := v_where || format(' and %I >= %L', p_date_field, p_date_from);
  end if;
  if p_date_to is not null then
    v_where := v_where || format(' and %I <= %L', p_date_field, p_date_to);
  end if;

  if p_filters is not null and jsonb_typeof(p_filters) = 'array' then
    for v_idx in 0..(jsonb_array_length(p_filters)-1) loop
      declare f jsonb := p_filters->v_idx; f_field text; f_op text; f_value jsonb; f_clause text;
      begin
        f_field := f->>'field'; f_op := f->>'op'; f_value := f->'value';
        if f_field is null or f_op is null then continue; end if;
        if f_op not in ('=','!=','in','between','like') then continue; end if;
        if f_op = 'in' then
          f_clause := format('%I = any(%L::text[])', f_field, array(select jsonb_array_elements_text(coalesce(f_value,'[]'::jsonb))));
        elsif f_op = 'between' then
          f_clause := format('%I between %L and %L', f_field, (f_value->>0), (f_value->>1));
        elsif f_op = 'like' then
          f_clause := format('%I like %L', f_field, (f_value->>0));
        elsif f_op = '!=' then
          f_clause := format('%I <> %L', f_field, (f_value)::text);
        else
          f_clause := format('%I = %L', f_field, (f_value)::text);
        end if;
        v_where := v_where || ' and ' || f_clause;
      end;
    end loop;
  end if;

  v_sql := 'select '|| v_select_cols || ' from public.monday_items_flat where '|| v_where;
  if v_group_by <> '' then v_sql := v_sql || ' group by '|| v_group_by; end if;
  if p_limit is not null and p_limit > 0 then v_sql := v_sql || ' limit '|| p_limit::text; end if;

  execute 'select coalesce(array_agg(to_jsonb(t)), array[]::jsonb[]) from ('|| v_sql ||') t' into v_rows;

  return query select v_rows, v_sql;
end;
$function$;

-- 2) Tighten dataset_insights visibility
-- Remove blanket public read
drop policy if exists "Enable read access for all users" on public.dataset_insights;

-- 3) Lock monday_sync_logs behind admin role
-- Remove public read
drop policy if exists "Public can read monday_sync_logs" on public.monday_sync_logs;

-- Ensure has_role helper exists
create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- Admin-only read of monday_sync_logs
drop policy if exists "monday logs admin select" on public.monday_sync_logs;
create policy "monday logs admin select"
on public.monday_sync_logs
for select
using (public.has_role(auth.uid(), 'admin'));

-- 4) Prevent self-escalation in user_roles
-- Remove self upsert/update policies
drop policy if exists "role self upsert" on public.user_roles;
drop policy if exists "role self update" on public.user_roles;

-- Add admin-only insert/update policies
create policy "roles admin insert"
on public.user_roles
for insert
with check (public.has_role(auth.uid(), 'admin'));

create policy "roles admin update"
on public.user_roles
for update
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- 5) Revoke direct access to master_flat (view/table) from anon/authenticated
revoke all on table public.master_flat from anon, authenticated;

-- 6) Make 'datasets' storage bucket private and add owner policies
update storage.buckets set public = false where id = 'datasets';

-- Storage object policies for 'datasets' bucket, owner by first path segment == auth.uid()
create policy "Datasets objects are readable by owner"
on storage.objects
for select
using (
  bucket_id = 'datasets'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Datasets objects can be inserted by owner"
on storage.objects
for insert
with check (
  bucket_id = 'datasets'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Datasets objects can be updated by owner"
on storage.objects
for update
using (
  bucket_id = 'datasets'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'datasets'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Datasets objects can be deleted by owner"
on storage.objects
for delete
using (
  bucket_id = 'datasets'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);

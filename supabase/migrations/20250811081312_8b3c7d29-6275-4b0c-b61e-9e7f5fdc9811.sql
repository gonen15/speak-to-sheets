-- Make aggregate_master run with elevated privileges to read master_flat safely
create or replace function public.aggregate_master(
  p_metrics text[],
  p_dimensions text[] default '{}'::text[],
  p_filters jsonb default '[]'::jsonb,
  p_date_from date default null::date,
  p_date_to date default null::date,
  p_limit integer default 1000
) returns table(rows jsonb, sql text)
language plpgsql
security definer
set search_path to 'public'
as $$
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

  if array_length(p_dimensions,1) is not null then
    for i in 1..array_length(p_dimensions,1) loop
      d := p_dimensions[i];
      grp := grp || format('%I,', d);
      sel := sel || format('%I,', d);
    end loop;
  end if;
  if sel <> '' then sel := left(sel, length(sel)-1); end if;
  if grp <> '' then grp := ' group by ' || left(grp, length(grp)-1); end if;

  if p_date_from is not null then wh := wh || format(' and date >= %L', p_date_from); end if;
  if p_date_to   is not null then wh := wh || format(' and date <= %L', p_date_to); end if;

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

  execute 'select coalesce(jsonb_agg(t.*), ''[]''::jsonb) from (' || dyn_sql || ') t' into v_rows;

  return query select v_rows as rows, dyn_sql as sql;
end
$$;
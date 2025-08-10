-- Create or replace aggregate_dataset that aggregates uploaded CSV rows stored in dataset_rows
create or replace function public.aggregate_dataset(
  p_dataset_id uuid,
  p_metrics     text[],               -- numeric column names to sum + optional 'count'
  p_dimensions  text[] default '{}',  -- column names to group by
  p_filters     jsonb  default '[]'::jsonb,  -- [{field,op,value}]
  p_date_from   date   default null,
  p_date_to     date   default null,
  p_date_field  text   default null,  -- name of date column in CSV
  p_limit       int    default 1000
)
returns table(rows jsonb, sql text)
language plpgsql
set search_path to 'public'
as $$
declare
  select_list text := '';
  group_select text := '';
  group_by_list text := '';
  where_clauses text[] := array['r.dataset_id = '||quote_literal(p_dataset_id)];
  m text; d text; base_sql text; final_sql text;
  v_rows jsonb;
  i int;
begin
  if array_length(p_metrics,1) is null then
    raise exception 'at least one metric is required';
  end if;

  -- metrics
  foreach m in array p_metrics loop
    if m = 'count' then
      select_list := select_list || case when select_list='' then '' else ', ' end || 'count(*) as count';
    else
      select_list := select_list || case when select_list='' then '' else ', ' end ||
        format('sum(nullif((r.row->>%I)::numeric, ''NaN'')) as %I', m, m);
    end if;
  end loop;

  -- dimensions
  if array_length(p_dimensions,1) is not null and array_length(p_dimensions,1) > 0 then
    foreach d in array p_dimensions loop
      group_select := group_select || case when group_select='' then '' else ', ' end || format('(r.row->>%I) as %I', d, d);
      group_by_list := group_by_list || case when group_by_list='' then '' else ', ' end || format('(r.row->>%I)', d);
    end loop;
  end if;

  -- date filters
  if p_date_field is not null then
    if p_date_from is not null then
      where_clauses := where_clauses || format('(r.row->>%I)::date >= %L', p_date_field, p_date_from);
    end if;
    if p_date_to is not null then
      where_clauses := where_clauses || format('(r.row->>%I)::date <= %L', p_date_field, p_date_to);
    end if;
  end if;

  -- simple filters
  if jsonb_typeof(p_filters) = 'array' then
    for i in 0..coalesce(jsonb_array_length(p_filters)-1, -1) loop
      declare f jsonb := p_filters->i;
      declare f_field text := coalesce(f->>'field','');
      declare f_op    text := lower(coalesce(f->>'op',''));
      declare f_val   jsonb := f->'value';
      begin
        if f_field = '' then continue; end if;
        if f_op = '=' then
          where_clauses := where_clauses || format('(r.row->>%I) = %L', f_field, (f_val)::text);
        elsif f_op = '!=' then
          where_clauses := where_clauses || format('(r.row->>%I) <> %L', f_field, (f_val)::text);
        elsif f_op = 'in' and jsonb_typeof(f_val)='array' then
          where_clauses := where_clauses || format('(r.row->>%I) = any(%L::text[])', f_field,
            array(select jsonb_array_elements_text(f_val)));
        elsif f_op = 'like' then
          where_clauses := where_clauses || format('(r.row->>%I) like %L', f_field, (f_val->>0));
        end if;
      end;
    end loop;
  end if;

  base_sql := 'select '||
    case when group_select<>'' then group_select||', ' else '' end || select_list ||
    ' from public.dataset_rows r where '|| array_to_string(where_clauses, ' and ');

  if group_by_list<>'' then
    base_sql := base_sql || ' group by '||group_by_list;
  end if;

  final_sql := base_sql || ' order by 1 limit '|| greatest(1, least(coalesce(p_limit,1000), 10000));

  execute 'select coalesce(jsonb_agg(t.*), ''[]''::jsonb) from ('|| final_sql ||') t' into v_rows;

  return query select v_rows as rows, final_sql as sql;
end;
$$;
-- Fix dataset_upsert_from_csv by recreating it with explicit, unambiguous logic
-- The function runs as SECURITY DEFINER to bypass RLS where needed (e.g., deletes)

create or replace function public.dataset_upsert_from_csv(
  p_name text,
  p_csv text,
  p_source_url text default null,
  p_replace boolean default false
)
returns table(dataset_id uuid, action text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dataset_id uuid;
  v_action text;
  v_existing_dataset record;
  v_lines text[];
  v_headers text[];
  v_row_data jsonb;
  v_line text;
  v_cols text[];
  v_i int;
begin
  -- Find existing dataset owned by current user and not revoked
  select * into v_existing_dataset
  from public.uploaded_datasets d
  where d.name = p_name
    and d.created_by = auth.uid()
    and d.is_revoked = false
  limit 1;

  if v_existing_dataset.id is not null then
    if not p_replace then
      -- Dataset exists and not replacing
      return query select v_existing_dataset.id::uuid as dataset_id, 'exists'::text as action;
      return;
    else
      -- Replace existing dataset
      v_dataset_id := v_existing_dataset.id;
      v_action := 'replaced';

      -- Clear existing rows for this dataset explicitly
      delete from public.dataset_rows dr where dr.dataset_id = v_dataset_id;
    end if;
  else
    -- Create new dataset shell
    insert into public.uploaded_datasets (name, columns, source_url, created_by, storage_path)
    values (p_name, array[]::text[], p_source_url, auth.uid(), '')
    returning id into v_dataset_id;
    v_action := 'created';
  end if;

  -- Parse CSV lines
  v_lines := string_to_array(p_csv, E'\n');
  if coalesce(array_length(v_lines, 1), 0) < 1 then
    raise exception 'CSV file is empty';
  end if;

  -- Extract headers
  v_headers := string_to_array(trim(v_lines[1]), ',');

  -- Update dataset columns and row_count
  update public.uploaded_datasets d
  set columns = v_headers,
      row_count = greatest(0, coalesce(array_length(v_lines, 1), 1) - 1)
  where d.id = v_dataset_id;

  -- Insert all rows
  for v_i in 2..coalesce(array_length(v_lines, 1), 1) loop
    v_line := trim(v_lines[v_i]);
    continue when v_line is null or v_line = '';

    v_cols := string_to_array(v_line, ',');

    -- Build row json
    v_row_data := '{}'::jsonb;
    for v_i in 1..least(coalesce(array_length(v_headers, 1), 0), coalesce(array_length(v_cols, 1), 0)) loop
      v_row_data := v_row_data || jsonb_build_object(trim(v_headers[v_i]), trim(v_cols[v_i]));
    end loop;

    insert into public.dataset_rows (dataset_id, row)
    values (v_dataset_id, v_row_data);
  end loop;

  return query select v_dataset_id::uuid as dataset_id, v_action::text as action;
end;
$$;
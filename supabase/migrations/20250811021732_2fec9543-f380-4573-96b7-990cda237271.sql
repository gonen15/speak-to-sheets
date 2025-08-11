-- Create incoming storage bucket for temporary CSV files
insert into storage.buckets (id, name, public)
values ('incoming', 'incoming', false);

-- Create RLS policies for incoming bucket
create policy "Users can upload to incoming bucket"
on storage.objects for insert
with check (bucket_id = 'incoming' and auth.uid() is not null);

create policy "Users can download from incoming bucket"
on storage.objects for select
using (bucket_id = 'incoming' and auth.uid() is not null);

create policy "Users can delete from incoming bucket"
on storage.objects for delete
using (bucket_id = 'incoming' and auth.uid() is not null);

-- Create the dataset upsert function
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
  -- Check if dataset exists
  select * into v_existing_dataset 
  from uploaded_datasets 
  where name = p_name 
    and created_by = auth.uid() 
    and is_revoked = false;

  if v_existing_dataset.id is not null then
    if not p_replace then
      -- Dataset exists and not replacing
      return query select v_existing_dataset.id, 'exists'::text;
      return;
    else
      -- Replace existing dataset
      v_dataset_id := v_existing_dataset.id;
      v_action := 'replaced';
      
      -- Clear existing rows
      delete from dataset_rows where dataset_id = v_dataset_id;
    end if;
  else
    -- Create new dataset
    insert into uploaded_datasets (name, columns, source_url, created_by, storage_path)
    values (p_name, array[]::text[], p_source_url, auth.uid(), '')
    returning id into v_dataset_id;
    v_action := 'created';
  end if;

  -- Parse CSV
  v_lines := string_to_array(p_csv, E'\n');
  
  if array_length(v_lines, 1) < 1 then
    raise exception 'CSV file is empty';
  end if;

  -- Extract headers
  v_headers := string_to_array(trim(v_lines[1]), ',');
  
  -- Update dataset columns
  update uploaded_datasets 
  set columns = v_headers, 
      row_count = greatest(0, array_length(v_lines, 1) - 1)
  where id = v_dataset_id;

  -- Insert data rows
  for v_i in 2..array_length(v_lines, 1) loop
    v_line := trim(v_lines[v_i]);
    
    -- Skip empty lines
    continue when v_line = '' or v_line is null;
    
    v_cols := string_to_array(v_line, ',');
    
    -- Build JSON object
    v_row_data := '{}';
    for v_i in 1..least(array_length(v_headers, 1), array_length(v_cols, 1)) loop
      v_row_data := v_row_data || jsonb_build_object(trim(v_headers[v_i]), trim(v_cols[v_i]));
    end loop;
    
    insert into dataset_rows (dataset_id, row)
    values (v_dataset_id, v_row_data);
  end loop;

  return query select v_dataset_id, v_action;
end;
$$;
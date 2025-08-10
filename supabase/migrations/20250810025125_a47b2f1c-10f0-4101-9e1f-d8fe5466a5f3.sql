do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'monday_boards' and policyname = 'Public can read monday_boards'
  ) then
    create policy "Public can read monday_boards"
      on public.monday_boards for select
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'monday_items' and policyname = 'Public can read monday_items'
  ) then
    create policy "Public can read monday_items"
      on public.monday_items for select
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'monday_files' and policyname = 'Public can read monday_files'
  ) then
    create policy "Public can read monday_files"
      on public.monday_files for select
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'monday_sync_logs' and policyname = 'Public can read monday_sync_logs'
  ) then
    create policy "Public can read monday_sync_logs"
      on public.monday_sync_logs for select
      using (true);
  end if;
end $$;
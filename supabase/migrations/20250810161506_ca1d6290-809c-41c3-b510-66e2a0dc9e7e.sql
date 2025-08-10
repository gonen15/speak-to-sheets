-- Add RLS policies for exec_goals and exec_goal_snapshots
create policy "goals owner" on public.exec_goals
for all to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "snap owner" on public.exec_goal_snapshots
for select to authenticated using (
  exists(select 1 from public.exec_goals g where g.id = exec_goal_snapshots.goal_id and g.created_by = auth.uid())
);

-- Add constraints for better data validation
alter table public.exec_goals add constraint check_department check (department in ('sales','finance','marketing'));
alter table public.exec_goals add constraint check_source check (source in ('dataset','monday'));
alter table public.exec_goals add constraint check_period check (period in ('monthly','quarterly'));

-- Add indexes for performance
create index if not exists exec_goals_owner_idx on public.exec_goals(created_by);
create index if not exists exec_goals_meta_idx on public.exec_goals(department, source, ref_id, metric_key);
create index if not exists exec_goal_snapshots_idx on public.exec_goal_snapshots(goal_id, period_start);
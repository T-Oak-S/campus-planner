create table if not exists public.planner_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'planner_profiles'
  ) then
    alter publication supabase_realtime add table public.planner_profiles;
  end if;
end
$$;

create policy "Users can read their planner"
on public.planner_profiles for select
using (auth.uid() = user_id);

create policy "Users can create their planner"
on public.planner_profiles for insert
with check (auth.uid() = user_id);

create policy "Users can update their planner"
on public.planner_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their planner"
on public.planner_profiles for delete
using (auth.uid() = user_id);

create or replace function public.save_planner_data(
  expected_updated_at timestamptz,
  new_data jsonb
)
returns table(status text, data jsonb, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_data jsonb;
  current_updated_at timestamptz;
  saved_at timestamptz := coalesce((new_data ->> 'updatedAt')::timestamptz, now());
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- A per-user transaction lock also serializes the very first insert, when no row exists yet.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  select p.data, p.updated_at
  into current_data, current_updated_at
  from public.planner_profiles p
  where p.user_id = auth.uid()
  for update;

  if found and (expected_updated_at is null or current_updated_at <> expected_updated_at) then
    return query select 'conflict'::text, current_data, current_updated_at;
    return;
  end if;

  insert into public.planner_profiles(user_id, data, updated_at)
  values (auth.uid(), new_data, saved_at)
  on conflict (user_id) do update
    set data = excluded.data, updated_at = excluded.updated_at;

  return query select 'saved'::text, new_data, saved_at;
end;
$$;

grant execute on function public.save_planner_data(timestamptz, jsonb) to authenticated;
